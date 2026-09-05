import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../db/database.service.js';
import { EligibilityService } from '../payments-billing/eligibility.service.js';
import type { CallupSlotRow, CallupWaiverAction, CallupWaiverRow } from './callup-engine.types.js';

export interface CrearWaiverInput {
  organizationId: string;
  actorUserId: string; // coach
  callupListId: string;
  userId: string;
  action: CallupWaiverAction;
  internalComment: string;
}

export interface CrearWaiverResultado {
  waiver: CallupWaiverRow;
  slot: CallupSlotRow;
}

// UC-CUP-04 — Coach ejerce waiver sobre un jugador.
@Injectable()
export class CallupWaiverService {
  constructor(
    private readonly db: DatabaseService,
    private readonly eligibilityService: EligibilityService,
  ) {}

  async crear(input: CrearWaiverInput): Promise<CrearWaiverResultado> {
    // 2a. "El comentario es obligatorio, no una mejora de UX opcional."
    if (!input.internalComment || input.internalComment.trim() === '') {
      throw new BadRequestException('El comentario interno es obligatorio para ejercer un waiver (UC-CUP-04).');
    }

    // 1a. "Ningún waiver puede anular un bloqueo por saldo vencido — el waiver es una herramienta
    // de criterio deportivo, no un mecanismo para eludir el bloqueo financiero."
    const elegibilidad = await this.eligibilityService.consultar({
      organizationId: input.organizationId,
      athleteUserId: input.userId,
    });
    if (!elegibilidad.eligible) {
      throw new ForbiddenException(
        'No se puede ejercer un waiver sobre un jugador con saldo vencido cualificante — el bloqueo financiero no admite excepción de coach.',
      );
    }

    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows: listaRows } = await client.query(`select id from callup_list where id = $1`, [input.callupListId]);
      if (!listaRows[0]) throw new NotFoundException('callup_list no encontrada.');

      const { rows: existentes } = await client.query<CallupSlotRow>(
        `select * from callup_slot where callup_list_id = $1 and user_id = $2`,
        [input.callupListId, input.userId],
      );
      let slot = existentes[0] ?? null;

      if (input.action === 'exclude') {
        if (!slot) throw new BadRequestException('No se puede excluir a alguien que no está en la convocatoria.');
        const { rows } = await client.query<CallupSlotRow>(
          `update callup_slot set status = 'excluded' where id = $1 returning *`,
          [slot.id],
        );
        slot = rows[0];
      } else {
        // 'include': si ya tiene slot, se promueve a called (validando el máximo del formato); si
        // no tiene slot, es una incorporación nueva vía waiver (también validando el máximo).
        if (!slot || slot.status !== 'called') {
          await this.validarCupoDisponible(client, input.callupListId);
        }
        if (slot) {
          const { rows } = await client.query<CallupSlotRow>(
            `update callup_slot set status = 'called' where id = $1 returning *`,
            [slot.id],
          );
          slot = rows[0];
        } else {
          const { rows } = await client.query<CallupSlotRow>(
            `insert into callup_slot (organization_id, callup_list_id, user_id, status) values ($1, $2, $3, 'called') returning *`,
            [input.organizationId, input.callupListId, input.userId],
          );
          slot = rows[0];
        }
      }

      const { rows: waiverRows } = await client.query<CallupWaiverRow>(
        `insert into callup_waiver (organization_id, callup_slot_id, waived_by, action, internal_comment)
         values ($1, $2, $3, $4, $5)
         returning *`,
        [input.organizationId, slot.id, input.actorUserId, input.action, input.internalComment],
      );

      return { waiver: waiverRows[0], slot };
    });
  }

  // "Coach ejerce waiver... fuera de lo que sugiere el orden automático" — no puede violar el
  // límite de convocados del formato (regla dura de competencia, no una sugerencia).
  private async validarCupoDisponible(client: PoolClient, callupListId: string): Promise<void> {
    const { rows: reglaRows } = await client.query<{ max_players: number }>(
      `select cfr.max_players
       from callup_format_rule cfr
       join callup_list cl on cl.callup_format_rule_id = cfr.id
       where cl.id = $1`,
      [callupListId],
    );
    const maxPlayers = reglaRows[0].max_players;

    const { rows: conteoRows } = await client.query<{ total: string }>(
      `select count(*) as total from callup_slot where callup_list_id = $1 and status = 'called'`,
      [callupListId],
    );
    if (Number(conteoRows[0].total) >= maxPlayers) {
      throw new ConflictException(`No se puede incluir — ya se alcanzó el máximo de convocados (${maxPlayers}) para este formato.`);
    }
  }
}
