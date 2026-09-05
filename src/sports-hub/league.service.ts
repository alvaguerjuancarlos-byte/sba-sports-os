import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import type { LeagueCupRow, LeagueStandingRow } from './sports-hub.types.js';

export interface CrearLeagueCupInput {
  organizationId: string;
  actorUserId: string;
  seasonId: string;
  name: string;
  format: string;
  rules?: Record<string, unknown> | null;
  teamIds: string[];
}

export interface CrearLeagueCupResultado {
  leagueCup: LeagueCupRow;
  standings: LeagueStandingRow[];
}

export interface ConsultarHistorialResultado {
  leagueCup: LeagueCupRow;
  standings: LeagueStandingRow[];
}

// UC-SPT-04 — Crear liga, copa o torneo. UC-SPT-05 — Consultar historial de competencia.
@Injectable()
export class LeagueService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

  async crear(input: CrearLeagueCupInput): Promise<CrearLeagueCupResultado> {
    // Criterio de aceptación: "todo league_cup tiene al menos un team participante... antes de
    // poder programarle eventos."
    if (input.teamIds.length === 0) {
      throw new BadRequestException('Un league_cup requiere al menos un equipo participante.');
    }

    return this.db.withTenant(input.organizationId, async (client) => {
      let leagueCup: LeagueCupRow;
      try {
        const { rows } = await client.query<LeagueCupRow>(
          `insert into league_cup (organization_id, season_id, name, format, rules)
           values ($1, $2, $3, $4, $5)
           returning *`,
          [input.organizationId, input.seasonId, input.name, input.format, input.rules ? JSON.stringify(input.rules) : null],
        );
        leagueCup = rows[0];
      } catch (e) {
        if (this.esViolacionDeFk(e)) throw new NotFoundException('La season indicada no existe.');
        throw e;
      }

      // Criterio de aceptación: "la tabla de posiciones existe desde la creación de la
      // competencia, no se genera solo al capturar el primer resultado" — misma transacción.
      const standings: LeagueStandingRow[] = [];
      for (const teamId of input.teamIds) {
        try {
          const { rows } = await client.query<LeagueStandingRow>(
            `insert into league_standing (organization_id, league_cup_id, team_id, points, wins, draws, losses)
             values ($1, $2, $3, 0, 0, 0, 0)
             returning *`,
            [input.organizationId, leagueCup.id, teamId],
          );
          standings.push(rows[0]);
        } catch (e) {
          if (this.esViolacionDeFk(e)) throw new NotFoundException(`El team ${teamId} no existe.`);
          throw e;
        }
      }

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'league_cup',
        entityId: leagueCup.id,
        newValue: { seasonId: leagueCup.season_id, name: leagueCup.name, format: leagueCup.format, teamIds: input.teamIds },
      });

      return { leagueCup, standings };
    });
  }

  // UC-SPT-05 — "cualquier rol con visibilidad del equipo consulta resultados, tabla de
  // posiciones..." En Fase 3 se limita a lo que league_standing captura — el detalle de
  // goles/minutos/alineación llega con Match Center (Fase 4, no construido).
  async consultarHistorial(organizationId: string, leagueCupId: string): Promise<ConsultarHistorialResultado> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows: leagueCupRows } = await client.query<LeagueCupRow>(`select * from league_cup where id = $1`, [
        leagueCupId,
      ]);
      const leagueCup = leagueCupRows[0];
      if (!leagueCup) throw new NotFoundException('league_cup no encontrado.');

      const { rows: standings } = await client.query<LeagueStandingRow>(
        `select * from league_standing where league_cup_id = $1 order by points desc, wins desc`,
        [leagueCupId],
      );

      return { leagueCup, standings };
    });
  }

  // Lectura para consumidores de otros dominios (ej. HR/Coach Hub, UC-HR-05: "resumen de
  // desarrollo de equipo... agregando resultados de league_standing") — así ese dominio nunca hace
  // SELECT directo contra league_standing.
  async consultarStandingsPorEquipo(organizationId: string, teamId: string): Promise<LeagueStandingRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<LeagueStandingRow>(`select * from league_standing where team_id = $1`, [teamId]);
      return rows;
    });
  }

  private esViolacionDeFk(e: unknown): boolean {
    return typeof e === 'object' && e !== null && (e as { code?: string }).code === '23503';
  }
}
