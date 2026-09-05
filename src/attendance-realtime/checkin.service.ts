import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { EventService } from '../calendar-rsvp/event.service.js';
import { RosterService } from '../sports-hub/roster.service.js';
import type { BiometricConsentRow, CheckinEventRow } from './attendance-realtime.types.js';

export interface RegistrarCheckinFacialInput {
  organizationId: string;
  actorUserId: string;
  eventId: string;
  userId: string;
}

export interface RegistrarCheckinManualInput {
  organizationId: string;
  actorUserId: string; // quien confirma — coach o encargado de sede
  eventId: string;
  userId: string;
}

export interface RevisarAsistenciaResultado {
  presentes: CheckinEventRow[];
  faltantes: string[]; // user_id del roster esperado sin checkin_event todavía
}

export interface AforoPorEvento {
  eventId: string;
  checkins: number;
}

// UC-ATT-01/02 — Check-in de asistencia (facial y fallback manual). UC-ATT-03 — Confirmación por
// el coach. UC-ATT-04 — Aforo en vivo.
//
// No se construye reconocimiento facial propio — igual que Stripe/Auth0 en fases anteriores, la
// plataforma solo recibe el resultado ya confirmado de un proveedor biométrico gestionado
// (arquitectura §8); `registrarFacial` asume esa confirmación externa ya ocurrió.
@Injectable()
export class CheckinService {
  constructor(
    private readonly db: DatabaseService,
    private readonly eventService: EventService,
    private readonly rosterService: RosterService,
  ) {}

  async registrarFacial(input: RegistrarCheckinFacialInput): Promise<CheckinEventRow> {
    const event = await this.eventService.obtenerPorId(input.organizationId, input.eventId);
    if (!event) throw new NotFoundException('event no encontrado.');

    return this.db.withTenant(input.organizationId, async (client) => {
      // Criterio de aceptación: "ningún checkin_event.method = facial se crea para un user sin
      // biometric_consent.consent_status = granted vigente al momento del check-in."
      const { rows: consentimiento } = await client.query<BiometricConsentRow>(
        `select * from biometric_consent where user_id = $1 and consent_status = 'granted'`,
        [input.userId],
      );
      if (!consentimiento[0]) {
        throw new BadRequestException(
          'Esta persona no tiene consentimiento biométrico vigente — usar el fallback manual (UC-ATT-02).',
        );
      }

      // Paso 2: "el sistema... envía [el rostro] para comparación contra el provider_ref
      // almacenado" — sin un template ya enrolado no hay nada contra qué comparar, aunque el
      // consentimiento esté otorgado (consentir habilita la opción; enrolar el template es un
      // paso posterior, ver biometric-consent.service.ts).
      const { rows: template } = await client.query(`select 1 from biometric_template where user_id = $1 limit 1`, [
        input.userId,
      ]);
      if (template.length === 0) {
        throw new BadRequestException(
          'Esta persona no tiene un template biométrico registrado todavía — usar el fallback manual (UC-ATT-02).',
        );
      }

      try {
        const { rows } = await client.query<CheckinEventRow>(
          `insert into checkin_event (organization_id, event_id, user_id, method, checked_in_at)
           values ($1, $2, $3, 'facial', now())
           returning *`,
          [input.organizationId, input.eventId, input.userId],
        );
        return rows[0];
      } catch (e) {
        if (this.esViolacionDeUnicidad(e)) throw new ConflictException('Esta persona ya hizo check-in en este evento.');
        throw e;
      }
    });
  }

  async registrarManual(input: RegistrarCheckinManualInput): Promise<CheckinEventRow> {
    const event = await this.eventService.obtenerPorId(input.organizationId, input.eventId);
    if (!event) throw new NotFoundException('event no encontrado.');

    // 1a. "La persona no está en el roster/lista esperada de ese evento → el sistema permite el
    // registro igual... pero lo marca para revisión administrativa posterior." Un evento
    // multi-equipo (team_id null) no tiene un roster único contra el cual comparar.
    let flaggedForReview = false;
    if (event.team_id) {
      const roster = await this.rosterService.listarPorEquipo(input.organizationId, event.team_id, { status: 'active' });
      flaggedForReview = !roster.some((miembro) => miembro.user_id === input.userId);
    }

    return this.db.withTenant(input.organizationId, async (client) => {
      try {
        // "Todo checkin_event.method = manual_fallback registra quién confirmó — nunca queda
        // auto-confirmado."
        const { rows } = await client.query<CheckinEventRow>(
          `insert into checkin_event (organization_id, event_id, user_id, method, confirmed_by, flagged_for_review, checked_in_at)
           values ($1, $2, $3, 'manual_fallback', $4, $5, now())
           returning *`,
          [input.organizationId, input.eventId, input.userId, input.actorUserId, flaggedForReview],
        );
        return rows[0];
      } catch (e) {
        if (this.esViolacionDeUnicidad(e)) throw new ConflictException('Esta persona ya hizo check-in en este evento.');
        throw e;
      }
    });
  }

  // UC-ATT-03 — "El coach revisa... la lista de checkin_event contra el roster esperado." Capa de
  // control de calidad de solo lectura — la corrección en sí reusa registrarManual arriba, no es
  // un método de captura distinto.
  async revisarAsistencia(organizationId: string, eventId: string): Promise<RevisarAsistenciaResultado> {
    const event = await this.eventService.obtenerPorId(organizationId, eventId);
    if (!event) throw new NotFoundException('event no encontrado.');

    return this.db.withTenant(organizationId, async (client) => {
      const { rows: presentes } = await client.query<CheckinEventRow>(`select * from checkin_event where event_id = $1`, [
        eventId,
      ]);

      let faltantes: string[] = [];
      if (event.team_id) {
        const roster = await this.rosterService.listarPorEquipo(organizationId, event.team_id, { status: 'active' });
        const presentesIds = new Set(presentes.map((c) => c.user_id));
        faltantes = roster.filter((miembro) => !presentesIds.has(miembro.user_id)).map((miembro) => miembro.user_id);
      }

      return { presentes, faltantes };
    });
  }

  // UC-ATT-04 — "lectura directa de checkin_event sin re-cómputo pesado."
  async aforoPorEvento(organizationId: string, eventId: string): Promise<number> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<{ total: string }>(`select count(*) as total from checkin_event where event_id = $1`, [
        eventId,
      ]);
      return Number(rows[0].total);
    });
  }

  async aforoPorSede(organizationId: string, venueId: string): Promise<AforoPorEvento[]> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<{ event_id: string; checkins: string }>(
        `select e.id as event_id, count(c.id) as checkins
         from event e
         left join checkin_event c on c.event_id = e.id
         where e.venue_id = $1 and e.start_at <= now() and e.end_at >= now()
         group by e.id`,
        [venueId],
      );
      return rows.map((r) => ({ eventId: r.event_id, checkins: Number(r.checkins) }));
    });
  }

  // Lectura para consumidores de otros dominios (ej. Call-up Engine, UC-CUP-03: "puntaje de
  // prioridad por jugador basado en asistencia de la(s) semana(s) relevante(s)") — así ese
  // dominio nunca hace SELECT directo contra checkin_event, siempre vía este servicio.
  async contarCheckinsDesde(organizationId: string, userId: string, teamId: string, desde: Date): Promise<number> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<{ total: string }>(
        `select count(*) as total
         from checkin_event c
         join event e on e.id = c.event_id
         where c.user_id = $1 and e.team_id = $2 and c.checked_in_at >= $3`,
        [userId, teamId, desde.toISOString()],
      );
      return Number(rows[0].total);
    });
  }

  private esViolacionDeUnicidad(e: unknown): boolean {
    return typeof e === 'object' && e !== null && (e as { code?: string }).code === '23505';
  }
}
