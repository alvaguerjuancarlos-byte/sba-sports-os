import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { RosterService } from '../sports-hub/roster.service.js';
import { CheckinService } from '../attendance-realtime/checkin.service.js';
import { EventService } from '../calendar-rsvp/event.service.js';
import { ordenarAlternosPorPrioridad, type CallupSlotRow, type CandidatoAlterno } from './callup-engine.types.js';

// UC-CUP-03 — Generar lista de alternos priorizada por asistencia.
//
// [propuesto]: el puntaje de prioridad es el conteo de checkin_event reales (asistencia física,
// Attendance/Real-Time) del jugador con ese equipo dentro de la ventana configurable
// (callup_format_rule.priority_window_days) — el RFP solo exige cualitativamente "prioritize
// relevant-week attendance", sin dar una fórmula exacta; se usa asistencia real (checkin_event) en
// vez de solo RSVP (attendance) porque es la señal más concreta y verificable de "asistencia"
// literal. El desempate usa antigüedad en el equipo (roster_membership.created_at), tal como
// ejemplifica el documento fuente — nunca aleatorio, siempre reproducible con los mismos datos.
@Injectable()
export class CallupPriorityService {
  constructor(
    private readonly db: DatabaseService,
    private readonly rosterService: RosterService,
    private readonly checkinService: CheckinService,
    private readonly eventService: EventService,
  ) {}

  // Calcula y persiste priority_score para todos los slots 'alternate' de una convocatoria —
  // "el puntaje... es consultable por el coach, no una caja negra."
  async calcularYAsignar(organizationId: string, callupListId: string, teamId: string, ventanaDias: number): Promise<void> {
    const alternos = await this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<CallupSlotRow>(
        `select * from callup_slot where callup_list_id = $1 and status = 'alternate'`,
        [callupListId],
      );
      return rows;
    });
    if (alternos.length === 0) return;

    const desde = new Date();
    desde.setDate(desde.getDate() - ventanaDias);

    const puntajes = new Map<string, number>();
    for (const slot of alternos) {
      const checkins = await this.checkinService.contarCheckinsDesde(organizationId, slot.user_id, teamId, desde);
      puntajes.set(slot.user_id, checkins);
    }

    await this.db.withTenant(organizationId, async (client) => {
      for (const slot of alternos) {
        await client.query(`update callup_slot set priority_score = $2 where id = $1`, [slot.id, puntajes.get(slot.user_id) ?? 0]);
      }
    });
  }

  // UC-CUP-02, paso 5: "todo cupo liberado por declinación intenta llenarse con el siguiente
  // alterno antes de considerarse vacío." 5a: sin alternos disponibles, regresa null — el cupo
  // queda vacío y visible al coach, nunca se fuerza una convocatoria fuera de las reglas.
  async promoverSiguienteAlterno(organizationId: string, callupListId: string): Promise<CallupSlotRow | null> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows: alternos } = await client.query<CallupSlotRow>(
        `select * from callup_slot where callup_list_id = $1 and status = 'alternate'`,
        [callupListId],
      );
      if (alternos.length === 0) return null;

      const { rows: listaRows } = await client.query<{ event_id: string }>(`select event_id from callup_list where id = $1`, [
        callupListId,
      ]);
      const event = await this.eventService.obtenerPorId(organizationId, listaRows[0].event_id);
      const roster = event?.team_id ? await this.rosterService.listarPorEquipo(organizationId, event.team_id, { status: 'active' }) : [];
      const rosterPorUsuario = new Map(roster.map((m) => [m.user_id, m]));

      // Criterio de aceptación UC-CUP-03: "dado el mismo conjunto de datos, el sistema siempre
      // calcula el mismo orden" — se reusa la misma función de ordenamiento aquí que en
      // calcularYAsignar, en vez de un ORDER BY de SQL con un desempate distinto.
      const candidatos: CandidatoAlterno[] = alternos.map((slot) => ({
        userId: slot.user_id,
        priorityScore: Number(slot.priority_score ?? 0),
        rosterCreatedAt: rosterPorUsuario.get(slot.user_id)?.created_at ?? slot.created_at,
      }));
      const [primero] = ordenarAlternosPorPrioridad(candidatos);

      const { rows: updated } = await client.query<CallupSlotRow>(
        `update callup_slot set status = 'called' where callup_list_id = $1 and user_id = $2 returning *`,
        [callupListId, primero.userId],
      );
      return updated[0] ?? null;
    });
  }
}
