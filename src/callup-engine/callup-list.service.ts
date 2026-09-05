import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import { EventService } from '../calendar-rsvp/event.service.js';
import { TeamService } from '../sports-hub/team.service.js';
import { RosterService } from '../sports-hub/roster.service.js';
import { EligibilityService } from '../payments-billing/eligibility.service.js';
import { CallupFormatRuleService } from './callup-format-rule.service.js';
import { CallupPriorityService } from './callup-priority.service.js';
import type { CallupListRow, CallupSlotRow } from './callup-engine.types.js';

export interface GenerarConvocatoriaInput {
  organizationId: string;
  actorUserId: string;
  eventId: string;
  // [propuesto]: Sports Hub no modela "formato" (Fut3/Fut5/Fut7/Fut9) en `team` — se captura aquí
  // explícitamente en vez de inventar un campo nuevo en otro dominio solo para este caso de uso.
  format: string;
}

export interface GenerarConvocatoriaResultado {
  callupList: CallupListRow;
  slots: CallupSlotRow[];
}

// UC-CUP-01 — Generar convocatoria para un partido. El caso de uso más cross-domain del sistema:
// integra Calendar & RSVP (event), Sports Hub (team, roster_membership), Payments & Billing
// (UC-PAY-05, elegibilidad financiera) y este mismo dominio (callup_format_rule, prioridad de
// alternos) — ninguno leído por SELECT directo, siempre vía el servicio dueño.
@Injectable()
export class CallupListService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLog: AuditLogService,
    private readonly eventService: EventService,
    private readonly teamService: TeamService,
    private readonly rosterService: RosterService,
    private readonly eligibilityService: EligibilityService,
    private readonly callupFormatRuleService: CallupFormatRuleService,
    private readonly callupPriorityService: CallupPriorityService,
  ) {}

  async generar(input: GenerarConvocatoriaInput): Promise<GenerarConvocatoriaResultado> {
    const event = await this.eventService.obtenerPorId(input.organizationId, input.eventId);
    if (!event) throw new NotFoundException('event no encontrado.');
    if (!event.team_id) {
      throw new BadRequestException('No se puede generar una convocatoria para un evento multi-equipo (sin team_id).');
    }

    const team = await this.teamService.obtenerPorId(input.organizationId, event.team_id);
    if (!team) throw new NotFoundException('team no encontrado.');

    const rule = await this.callupFormatRuleService.obtenerActivaPara(input.organizationId, team.sport, input.format);
    if (!rule) {
      throw new NotFoundException(
        `No existe una callup_format_rule activa para '${team.sport}' formato '${input.format}' (configurar vía UC-CUP-06).`,
      );
    }

    const rosterCompleto = await this.rosterService.listarPorEquipo(input.organizationId, event.team_id, { status: 'active' });
    const jugadores = rosterCompleto.filter((miembro) => miembro.role === 'player');

    // 3/3a. "El sistema filtra por elegibilidad financiera... los jugadores bloqueados quedan
    // excluidos desde este paso... sin excepción de coach — excluye de convocados Y de alternos."
    const elegibles: typeof jugadores = [];
    for (const jugador of jugadores) {
      const elegibilidad = await this.eligibilityService.consultar({
        organizationId: input.organizationId,
        athleteUserId: jugador.user_id,
      });
      if (elegibilidad.eligible) elegibles.push(jugador);
    }

    // 4/5. "Aplica el máximo... llena los cupos disponibles... el resto pasa a alternos." 4a: "el
    // roster elegible disponible es menor al máximo → convoca a todos los disponibles; no fuerza
    // completar el cupo."
    const llamados = elegibles.slice(0, rule.max_players);
    const alternosIniciales = elegibles.slice(rule.max_players);

    const resultado = await this.db.withTenant(input.organizationId, async (client) => {
      let callupList: CallupListRow;
      try {
        const { rows } = await client.query<CallupListRow>(
          `insert into callup_list (organization_id, event_id, callup_format_rule_id) values ($1, $2, $3) returning *`,
          [input.organizationId, input.eventId, rule.id],
        );
        callupList = rows[0];
      } catch (e) {
        if (this.esViolacionDeUnicidad(e)) throw new ConflictException('Ya existe una convocatoria para este evento.');
        throw e;
      }

      const slots: CallupSlotRow[] = [];
      for (const jugador of llamados) {
        const { rows } = await client.query<CallupSlotRow>(
          `insert into callup_slot (organization_id, callup_list_id, user_id, status) values ($1, $2, $3, 'called') returning *`,
          [input.organizationId, callupList.id, jugador.user_id],
        );
        slots.push(rows[0]);
      }
      for (const jugador of alternosIniciales) {
        const { rows } = await client.query<CallupSlotRow>(
          `insert into callup_slot (organization_id, callup_list_id, user_id, status) values ($1, $2, $3, 'alternate') returning *`,
          [input.organizationId, callupList.id, jugador.user_id],
        );
        slots.push(rows[0]);
      }

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'callup_list',
        entityId: callupList.id,
        newValue: { eventId: input.eventId, called: llamados.length, alternates: alternosIniciales.length },
      });

      return { callupList, slots };
    });

    // UC-CUP-03 corre en el mismo disparador que UC-CUP-01 ("se genera la convocatoria") — fuera
    // de la transacción anterior porque hace sus propias llamadas cross-domain con su propio
    // withTenant.
    if (alternosIniciales.length > 0) {
      await this.callupPriorityService.calcularYAsignar(input.organizationId, resultado.callupList.id, event.team_id, rule.priority_window_days);
    }

    return resultado;
  }

  private esViolacionDeUnicidad(e: unknown): boolean {
    return typeof e === 'object' && e !== null && (e as { code?: string }).code === '23505';
  }
}
