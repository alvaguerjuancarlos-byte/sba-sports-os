import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import type { MatchEventRow, MatchScoreRow, PlayerStatisticRow } from './match-center.types.js';

export interface ConsultarEnVivoResultado {
  matchScore: MatchScoreRow;
  eventos: MatchEventRow[];
}

// UC-MAT-04 — Consultar eventos y marcador en vivo. UC-MAT-05 — Consultar estadísticas finales.
@Injectable()
export class MatchQueryService {
  constructor(private readonly db: DatabaseService) {}

  async consultarEnVivo(organizationId: string, eventId: string): Promise<ConsultarEnVivoResultado> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows: scoreRows } = await client.query<MatchScoreRow>(`select * from match_score where event_id = $1`, [
        eventId,
      ]);
      const matchScore = scoreRows[0];
      if (!matchScore) throw new NotFoundException('Este partido todavía no ha iniciado.');

      const { rows: eventos } = await client.query<MatchEventRow>(
        `select * from match_event where event_id = $1 order by minute, created_at`,
        [eventId],
      );

      return { matchScore, eventos };
    });
  }

  // "Cualquier rol con visibilidad consulta minutos jugados, goles y tarjetas por
  // jugador/equipo/temporada."
  async consultarEstadisticasDeJugador(organizationId: string, userId: string): Promise<PlayerStatisticRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<PlayerStatisticRow>(
        `select * from player_statistic where user_id = $1 order by created_at desc`,
        [userId],
      );
      return rows;
    });
  }

  async consultarEstadisticasDePartido(organizationId: string, eventId: string): Promise<PlayerStatisticRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<PlayerStatisticRow>(`select * from player_statistic where event_id = $1`, [eventId]);
      return rows;
    });
  }
}
