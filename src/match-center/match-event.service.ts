import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { CallupListService } from '../callup-engine/callup-list.service.js';
import type { MatchCardColor, MatchEventRow, MatchEventType, MatchLineupRow, MatchScoreRow } from './match-center.types.js';

export interface RegistrarMatchEventInput {
  organizationId: string;
  actorUserId: string;
  eventId: string;
  type: MatchEventType;
  minute: number;
  // Jugador principal: anotador (goal), tarjeteado (card), o el que sale (substitution).
  playerLineupId: string;
  cardColor?: MatchCardColor | null;
  // Solo para substitution — el jugador que entra todavía no tiene match_lineup, se crea aquí.
  substituteCallupSlotId?: string;
  substitutePosition?: string;
  substituteFormationSlot?: string;
}

export interface ActualizarMarcadorRivalInput {
  organizationId: string;
  actorUserId: string;
  eventId: string;
  opponentScore: number;
}

// UC-MAT-02 — Registrar evento en vivo (gol, sustitución, tarjeta).
@Injectable()
export class MatchEventService {
  constructor(
    private readonly db: DatabaseService,
    private readonly callupListService: CallupListService,
  ) {}

  async registrar(input: RegistrarMatchEventInput): Promise<MatchEventRow> {
    if (input.minute < 0) throw new BadRequestException('El minuto no puede ser negativo.');
    if (input.type === 'substitution' && !input.substituteCallupSlotId) {
      throw new BadRequestException('Una sustitución requiere el callup_slot del jugador que entra.');
    }

    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows: scoreRows } = await client.query<MatchScoreRow>(`select * from match_score where event_id = $1`, [
        input.eventId,
      ]);
      const score = scoreRows[0];
      if (!score) throw new NotFoundException('Este partido todavía no ha iniciado (no existe match_score).');
      if (score.status !== 'live') throw new ConflictException('Este partido ya no está en vivo.');

      // 1a. "Se intenta capturar un evento para un jugador que no está en el match_lineup activo
      // en ese momento → el sistema rechaza la captura."
      const { rows: lineupRows } = await client.query<MatchLineupRow>(
        `select * from match_lineup where id = $1 and event_id = $2 and is_active = true`,
        [input.playerLineupId, input.eventId],
      );
      if (!lineupRows[0]) {
        throw new BadRequestException('El jugador indicado no está activo en el match_lineup de este partido.');
      }

      let substituteLineupId: string | null = null;
      if (input.type === 'substitution') {
        // El entrante debe venir de un callup_slot confirmado (mismo criterio de integridad que
        // UC-MAT-01) — "agrega al entrante", crea su match_lineup aquí, no antes.
        const slot = await this.callupListService.obtenerSlotConfirmado(
          input.organizationId,
          input.eventId,
          input.substituteCallupSlotId as string,
        );
        if (!slot) {
          throw new BadRequestException('El callup_slot del jugador que entra no está confirmado en la convocatoria de este evento.');
        }
        try {
          const { rows: nuevoLineup } = await client.query<MatchLineupRow>(
            `insert into match_lineup (organization_id, event_id, callup_slot_id, user_id, position, formation_slot, is_starter, is_active)
             values ($1, $2, $3, $4, $5, $6, false, true)
             returning *`,
            [
              input.organizationId,
              input.eventId,
              slot.id,
              slot.user_id,
              input.substitutePosition ?? '',
              input.substituteFormationSlot ?? '',
            ],
          );
          substituteLineupId = nuevoLineup[0].id;
        } catch (e) {
          if (this.esViolacionDeUnicidad(e)) {
            throw new ConflictException('Este jugador ya tiene una fila de alineación para este evento (ya entró antes).');
          }
          throw e;
        }

        await client.query(`update match_lineup set is_active = false where id = $1`, [input.playerLineupId]);
      }

      // 2. "El sistema crea match_event con pushed_at" — se fija en la MISMA operación (criterio
      // de aceptación: "el push a espectadores ocurre en la misma operación que el registro del
      // evento, no en un batch posterior"). No hay un canal de push real construido (WebSocket/SSE
      // deferred, mismo tipo de integración externa que Stripe/Auth0) — pushed_at documenta que el
      // evento quedó listo para difundirse desde el instante de su creación.
      const { rows: eventoRows } = await client.query<MatchEventRow>(
        `insert into match_event (organization_id, event_id, type, minute, player_lineup_id, substitute_lineup_id, card_color, pushed_at)
         values ($1, $2, $3, $4, $5, $6, $7, now())
         returning *`,
        [
          input.organizationId,
          input.eventId,
          input.type,
          input.minute,
          input.playerLineupId,
          substituteLineupId,
          input.type === 'card' ? (input.cardColor ?? null) : null,
        ],
      );

      // 3. "Si es gol, el sistema actualiza match_score."
      if (input.type === 'goal') {
        await client.query(`update match_score set team_score = team_score + 1 where event_id = $1`, [input.eventId]);
      }

      return eventoRows[0];
    });
  }

  // [propuesto] — el documento fuente no detalla cómo se captura el gol del equipo RIVAL (los
  // eventos siempre están atados a "el jugador involucrado", y el rival no es una entidad de este
  // sistema — Sports Hub no modela clubes externos). Se expone un ajuste directo del marcador
  // rival, separado del flujo de match_event.
  async actualizarMarcadorRival(input: ActualizarMarcadorRivalInput): Promise<MatchScoreRow> {
    if (input.opponentScore < 0) throw new BadRequestException('El marcador no puede ser negativo.');

    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<MatchScoreRow>(`select * from match_score where event_id = $1`, [input.eventId]);
      const score = rows[0];
      if (!score) throw new NotFoundException('Este partido todavía no ha iniciado.');
      if (score.status !== 'live') throw new ConflictException('Este partido ya no está en vivo.');

      const { rows: updated } = await client.query<MatchScoreRow>(
        `update match_score set opponent_score = $2 where event_id = $1 returning *`,
        [input.eventId, input.opponentScore],
      );
      return updated[0];
    });
  }

  private esViolacionDeUnicidad(e: unknown): boolean {
    return typeof e === 'object' && e !== null && (e as { code?: string }).code === '23505';
  }
}
