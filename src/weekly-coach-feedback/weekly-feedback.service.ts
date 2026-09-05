import { NotFoundException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import { TeamService } from '../sports-hub/team.service.js';
import { RosterService } from '../sports-hub/roster.service.js';
import type { EntradaFeedbackJugador, ResultadoEntradaLote, WeeklyFeedbackRow } from './weekly-coach-feedback.types.js';

export interface CapturarLoteInput {
  organizationId: string;
  actorUserId: string; // coach
  teamId: string;
  weekEnding: string; // 'YYYY-MM-DD'
  entradas: EntradaFeedbackJugador[];
}

// UC-WCF-01 — Capturar feedback semanal por lote.
//
// Cada jugador del lote se procesa en SU PROPIA transacción (no una sola transacción para todo el
// lote) — es la única forma de garantizar el criterio de aceptación "ningún campo obligatorio de
// un jugador bloquea el guardado del resto del lote" también a nivel de base de datos: en una
// transacción compartida, un error de Postgres en una fila (ej. constraint violado) deja el resto
// de las queries de esa misma transacción en estado "aborted" hasta el rollback, arrastrando
// consigo a jugadores que sí eran válidos.
//
// El upsert por (player_id, week_ending) es un MERGE campo a campo (coalesce contra el valor
// existente), no un reemplazo total — "el sistema permite guardado parcial... se completa
// después" (comentario de la migración) solo se cumple si volver a capturar la misma semana con
// menos campos no borra lo que ya se había guardado antes.
@Injectable()
export class WeeklyFeedbackService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLog: AuditLogService,
    private readonly teamService: TeamService,
    private readonly rosterService: RosterService,
  ) {}

  async capturarLote(input: CapturarLoteInput): Promise<ResultadoEntradaLote[]> {
    const team = await this.teamService.obtenerPorId(input.organizationId, input.teamId);
    if (!team) throw new NotFoundException('team no encontrado.');

    const roster = await this.rosterService.listarPorEquipo(input.organizationId, input.teamId, { status: 'active' });
    const jugadoresActivos = new Set(roster.filter((r) => r.role === 'player').map((r) => r.user_id));

    const resultados: ResultadoEntradaLote[] = [];
    for (const entrada of input.entradas) {
      // 2a. jugador fuera del roster activo del equipo — se registra el error para esta entrada y
      // se continúa con el resto, nunca se aborta el lote completo.
      if (!jugadoresActivos.has(entrada.playerId)) {
        resultados.push({ playerId: entrada.playerId, ok: false, error: 'No es un jugador activo de este equipo.' });
        continue;
      }

      try {
        const feedback = await this.db.withTenant(input.organizationId, async (client) => {
          const { rows } = await client.query<WeeklyFeedbackRow>(
            `insert into weekly_feedback
              (organization_id, team_id, player_id, coach_id, week_ending, mood, attention, attitude,
               disposition, commitment, dna, sport_question_1, sport_question_2, sport_question_3, note, voice_url)
             values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
             on conflict (player_id, week_ending) do update set
               team_id = excluded.team_id,
               coach_id = excluded.coach_id,
               mood = coalesce(excluded.mood, weekly_feedback.mood),
               attention = coalesce(excluded.attention, weekly_feedback.attention),
               attitude = coalesce(excluded.attitude, weekly_feedback.attitude),
               disposition = coalesce(excluded.disposition, weekly_feedback.disposition),
               commitment = coalesce(excluded.commitment, weekly_feedback.commitment),
               dna = coalesce(excluded.dna, weekly_feedback.dna),
               sport_question_1 = coalesce(excluded.sport_question_1, weekly_feedback.sport_question_1),
               sport_question_2 = coalesce(excluded.sport_question_2, weekly_feedback.sport_question_2),
               sport_question_3 = coalesce(excluded.sport_question_3, weekly_feedback.sport_question_3),
               note = coalesce(excluded.note, weekly_feedback.note),
               voice_url = coalesce(excluded.voice_url, weekly_feedback.voice_url),
               updated_at = now()
             returning *`,
            [
              input.organizationId,
              input.teamId,
              entrada.playerId,
              input.actorUserId,
              input.weekEnding,
              entrada.mood ?? null,
              entrada.attention ?? null,
              entrada.attitude ?? null,
              entrada.disposition ?? null,
              entrada.commitment ?? null,
              entrada.dna ?? null,
              entrada.sportQuestion1 ?? null,
              entrada.sportQuestion2 ?? null,
              entrada.sportQuestion3 ?? null,
              entrada.note ?? null,
              entrada.voiceUrl ?? null,
            ],
          );
          const fila = rows[0];

          await this.auditLog.record(client, {
            organizationId: input.organizationId,
            actorUserId: input.actorUserId,
            entityType: 'weekly_feedback',
            entityId: fila.id,
            newValue: { playerId: fila.player_id, weekEnding: fila.week_ending },
          });

          return fila;
        });

        resultados.push({ playerId: entrada.playerId, ok: true, feedback });
      } catch (e) {
        resultados.push({ playerId: entrada.playerId, ok: false, error: e instanceof Error ? e.message : 'Error desconocido.' });
      }
    }

    return resultados;
  }
}
