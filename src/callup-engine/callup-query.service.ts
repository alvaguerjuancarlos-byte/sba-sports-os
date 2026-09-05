import { NotFoundException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { redactarComentarioSiNoTieneScope } from './callup-engine.types.js';
import type { CallupListRow, CallupSlotRow, CallupWaiverRedactado, CallupWaiverRow } from './callup-engine.types.js';

export interface ConsultarConvocatoriaInput {
  organizationId: string;
  eventId: string;
  actorUserId: string;
  actorRoles: string[];
}

export interface CallupSlotConWaivers extends CallupSlotRow {
  waivers: CallupWaiverRedactado[];
}

export interface ConsultarConvocatoriaResultado {
  callupList: CallupListRow;
  slots: CallupSlotConWaivers[];
}

// UC-CUP-05 — Consultar convocatoria final y lista de alternos. "Familia/jugador consulta su
// propio estado... Coach consulta la lista completa... el internal_comment nunca se expone a la
// vista de familia/jugador."
@Injectable()
export class CallupQueryService {
  constructor(private readonly db: DatabaseService) {}

  async consultarPorEvento(input: ConsultarConvocatoriaInput): Promise<ConsultarConvocatoriaResultado> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows: listaRows } = await client.query<CallupListRow>(`select * from callup_list where event_id = $1`, [
        input.eventId,
      ]);
      const callupList = listaRows[0];
      if (!callupList) throw new NotFoundException('No existe convocatoria para este evento.');

      const { rows: todosLosSlots } = await client.query<CallupSlotRow>(
        `select * from callup_slot where callup_list_id = $1 order by status, priority_score desc nulls last`,
        [callupList.id],
      );

      // "Coach consulta la lista completa" — coach/admin/director ven todo; familia/jugador solo
      // su propio slot.
      const esStaff = input.actorRoles.some((rol) => rol === 'admin' || rol === 'director' || rol === 'coach');
      const slotsVisibles = esStaff ? todosLosSlots : todosLosSlots.filter((slot) => slot.user_id === input.actorUserId);

      const slots: CallupSlotConWaivers[] = [];
      for (const slot of slotsVisibles) {
        const { rows: waivers } = await client.query<CallupWaiverRow>(
          `select * from callup_waiver where callup_slot_id = $1 order by created_at`,
          [slot.id],
        );
        slots.push({ ...slot, waivers: waivers.map((w) => redactarComentarioSiNoTieneScope(w, input.actorRoles)) });
      }

      return { callupList, slots };
    });
  }
}
