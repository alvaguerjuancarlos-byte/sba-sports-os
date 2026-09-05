import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { RosterService } from '../sports-hub/roster.service.js';
import { GuardianConsentService } from '../identity-access/guardian-consent.service.js';
import type { AttendanceRow, EventRow, RsvpStatus } from './calendar-rsvp.types.js';

export interface ConsultarCalendarioInput {
  organizationId: string;
  actorUserId: string;
  actorRoles: string[];
}

export interface EventoDeCalendario extends EventRow {
  miRsvp: RsvpStatus | null;
  // Solo presentes para coach/admin/director — "para el coach, el conteo agregado de
  // confirmados/declinados/pendientes por evento."
  confirmados?: number;
  declinados?: number;
  pendientes?: number;
}

// UC-CAL-04 — Consultar calendario (vista equipo/familia/coach), condensado. "Cada rol ve el
// calendario filtrado a su alcance." [propuesto]: cuando un actor tiene varios roles relevantes se
// usa la vista más amplia disponible (staff > coach > parent > player), en ese orden.
@Injectable()
export class CalendarService {
  constructor(
    private readonly db: DatabaseService,
    private readonly rosterService: RosterService,
    private readonly guardianConsentService: GuardianConsentService,
  ) {}

  async consultar(input: ConsultarCalendarioInput): Promise<EventoDeCalendario[]> {
    const esStaff = input.actorRoles.includes('admin') || input.actorRoles.includes('director');
    const esCoach = input.actorRoles.includes('coach');
    const esParent = input.actorRoles.includes('parent');

    // null = sin filtro de equipo ("admin ve la organización completa").
    let teamIds: string[] | null = null;
    if (!esStaff) {
      if (esCoach) {
        teamIds = await this.rosterService.listarEquiposDeUsuario(input.organizationId, input.actorUserId, { role: 'coach' });
      } else if (esParent) {
        const atletas = await this.guardianConsentService.listarAtletasDeGuardian(input.organizationId, input.actorUserId);
        const porAtleta = await Promise.all(
          atletas.map((atletaId) => this.rosterService.listarEquiposDeUsuario(input.organizationId, atletaId)),
        );
        teamIds = [...new Set(porAtleta.flat())];
      } else {
        // "familia ve los eventos de sus hijos" ya cubierto arriba (parent); esta rama es el
        // jugador viendo sus propios equipos.
        teamIds = await this.rosterService.listarEquiposDeUsuario(input.organizationId, input.actorUserId);
      }
    }

    return this.db.withTenant(input.organizationId, async (client) => {
      let eventos: EventRow[];
      if (teamIds === null) {
        const { rows } = await client.query<EventRow>(`select * from event order by start_at`);
        eventos = rows;
      } else {
        // Los eventos multi-equipo (team_id null, ej. torneo con varias categorías) son visibles
        // para todos — incluida una persona sin ningún equipo (teamIds = []), por eso esta rama
        // NO se salta con un atajo cuando teamIds está vacío: `= any('{}')` correctamente no
        // hace match con ningún team_id, pero `or team_id is null` sigue aplicando.
        const { rows } = await client.query<EventRow>(
          `select * from event where team_id = any($1::uuid[]) or team_id is null order by start_at`,
          [teamIds],
        );
        eventos = rows;
      }

      const resultado: EventoDeCalendario[] = [];
      for (const evento of eventos) {
        const { rows: miAttendance } = await client.query<AttendanceRow>(
          `select * from attendance where event_id = $1 and user_id = $2`,
          [evento.id, input.actorUserId],
        );
        const item: EventoDeCalendario = { ...evento, miRsvp: miAttendance[0]?.status ?? null };

        if (esStaff || esCoach) {
          const { rows: conteo } = await client.query<{ status: RsvpStatus; total: string }>(
            `select status, count(*) as total from attendance where event_id = $1 group by status`,
            [evento.id],
          );
          item.confirmados = Number(conteo.find((c) => c.status === 'confirmed')?.total ?? 0);
          item.declinados = Number(conteo.find((c) => c.status === 'declined')?.total ?? 0);
          item.pendientes = Number(conteo.find((c) => c.status === 'pending')?.total ?? 0);
        }

        resultado.push(item);
      }

      return resultado;
    });
  }
}
