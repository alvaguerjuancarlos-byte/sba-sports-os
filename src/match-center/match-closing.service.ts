import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { EventService } from '../calendar-rsvp/event.service.js';
import { calcularMinutosJugados } from './match-center.types.js';
import type { MatchEventRow, MatchLineupRow, MatchScoreRow, PlayerStatisticRow } from './match-center.types.js';

export interface CerrarPartidoInput {
  organizationId: string;
  actorUserId: string;
  eventId: string;
  // [propuesto]: sin esto, un partido con cero match_event (0-0 sin goles/tarjetas/cambios) no
  // tendría forma de calcular minutos jugados para nadie — el documento fuente no da un mecanismo
  // alterno y exige explícitamente consolidar player_statistic "aunque el resultado sea cero
  // eventos."
  finalMinute: number;
}

export interface CerrarPartidoResultado {
  matchScore: MatchScoreRow;
  estadisticas: PlayerStatisticRow[];
  standingActualizado: boolean;
}

// UC-MAT-03 — Cerrar partido y consolidar estadísticas finales.
@Injectable()
export class MatchClosingService {
  constructor(
    private readonly db: DatabaseService,
    private readonly eventService: EventService,
  ) {}

  async cerrar(input: CerrarPartidoInput): Promise<CerrarPartidoResultado> {
    const event = await this.eventService.obtenerPorId(input.organizationId, input.eventId);
    if (!event) throw new NotFoundException('event no encontrado.');

    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows: scoreRows } = await client.query<MatchScoreRow>(`select * from match_score where event_id = $1`, [
        input.eventId,
      ]);
      if (!scoreRows[0]) throw new NotFoundException('Este partido no ha iniciado.');
      if (scoreRows[0].status !== 'live') throw new ConflictException('Este partido ya está cerrado.');

      // 2. "El sistema transiciona match_score.status de live a final."
      const { rows: matchScoreFinalRows } = await client.query<MatchScoreRow>(
        `update match_score set status = 'final' where event_id = $1 returning *`,
        [input.eventId],
      );
      const matchScore = matchScoreFinalRows[0];

      // 3. "Consolida player_statistic por jugador... a partir de match_event y match_lineup" —
      // criterio de aceptación: se intenta SIEMPRE, aunque no haya ni un solo match_event.
      const { rows: lineups } = await client.query<MatchLineupRow>(`select * from match_lineup where event_id = $1`, [
        input.eventId,
      ]);
      const { rows: eventos } = await client.query<MatchEventRow>(`select * from match_event where event_id = $1`, [
        input.eventId,
      ]);

      const estadisticasPorUsuario = new Map<string, { minutesPlayed: number; goals: number; cards: number }>();
      for (const lineup of lineups) {
        const eventoDeEntrada = eventos.find((e) => e.type === 'substitution' && e.substitute_lineup_id === lineup.id);
        const eventoDeSalida = eventos.find((e) => e.type === 'substitution' && e.player_lineup_id === lineup.id);

        const minutesPlayed = calcularMinutosJugados({
          lineup,
          minutoDeEntrada: eventoDeEntrada?.minute ?? null,
          minutoDeSalida: eventoDeSalida?.minute ?? null,
          finalMinute: input.finalMinute,
        });
        const goals = eventos.filter((e) => e.type === 'goal' && e.player_lineup_id === lineup.id).length;
        const cards = eventos.filter((e) => e.type === 'card' && e.player_lineup_id === lineup.id).length;

        const previo = estadisticasPorUsuario.get(lineup.user_id) ?? { minutesPlayed: 0, goals: 0, cards: 0 };
        estadisticasPorUsuario.set(lineup.user_id, {
          minutesPlayed: previo.minutesPlayed + minutesPlayed,
          goals: previo.goals + goals,
          cards: previo.cards + cards,
        });
      }

      const estadisticas: PlayerStatisticRow[] = [];
      for (const [userId, stats] of estadisticasPorUsuario) {
        const { rows } = await client.query<PlayerStatisticRow>(
          `insert into player_statistic (organization_id, event_id, user_id, minutes_played, goals, cards)
           values ($1, $2, $3, $4, $5, $6)
           on conflict (event_id, user_id)
           do update set minutes_played = excluded.minutes_played, goals = excluded.goals, cards = excluded.cards
           returning *`,
          [input.organizationId, input.eventId, userId, stats.minutesPlayed, stats.goals, stats.cards],
        );
        estadisticas.push(rows[0]);
      }

      // 4/4a. "Si el partido pertenece a un league_cup, actualiza league_standing... Si es
      // amistoso, sin league_cup, omite la actualización de standings, pero sí consolida
      // player_statistic — las estadísticas individuales no dependen de que el partido sea de
      // competencia formal."
      let standingActualizado = false;
      if (event.league_cup_id && event.team_id) {
        const resultado =
          matchScore.team_score > matchScore.opponent_score ? 'win' : matchScore.team_score < matchScore.opponent_score ? 'loss' : 'draw';
        const incremento =
          resultado === 'win'
            ? { points: 3, wins: 1, draws: 0, losses: 0 }
            : resultado === 'draw'
              ? { points: 1, wins: 0, draws: 1, losses: 0 }
              : { points: 0, wins: 0, draws: 0, losses: 1 };

        await client.query(
          `update league_standing
           set points = points + $3, wins = wins + $4, draws = draws + $5, losses = losses + $6
           where league_cup_id = $1 and team_id = $2`,
          [event.league_cup_id, event.team_id, incremento.points, incremento.wins, incremento.draws, incremento.losses],
        );
        standingActualizado = true;
      }

      return { matchScore, estadisticas, standingActualizado };
    });
  }
}
