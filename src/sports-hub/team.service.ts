import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import type { TeamRow, TeamStatus } from './sports-hub.types.js';

export interface CrearTeamInput {
  organizationId: string;
  actorUserId: string;
  name: string;
  category: string;
  sport: string;
  seasonId: string;
}

export interface ArchivarTeamInput {
  organizationId: string;
  actorUserId: string;
  teamId: string;
}

// UC-SPT-02 — Crear equipo y asignar categoría/deporte. "El deporte queda fijo a nivel de equipo,
// no de jugador" — un jugador multi-deporte tiene dos roster_membership en dos team distintos
// (UC-SPT-03), nunca un team "multi-deporte".
@Injectable()
export class TeamService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

  async crear(input: CrearTeamInput): Promise<TeamRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      let team: TeamRow;
      try {
        const { rows } = await client.query<TeamRow>(
          `insert into team (organization_id, season_id, name, category, sport, status)
           values ($1, $2, $3, $4, $5, 'active')
           returning *`,
          [input.organizationId, input.seasonId, input.name, input.category, input.sport],
        );
        team = rows[0];
      } catch (e) {
        if (this.esViolacionDeFk(e)) throw new NotFoundException('La season indicada no existe.');
        throw e;
      }

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'team',
        entityId: team.id,
        newValue: { name: team.name, category: team.category, sport: team.sport, seasonId: team.season_id },
      });

      return team;
    });
  }

  async archivar(input: ArchivarTeamInput): Promise<TeamRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<TeamRow>(`select * from team where id = $1`, [input.teamId]);
      const anterior = rows[0];
      if (!anterior) throw new NotFoundException('team no encontrado.');

      const { rows: updated } = await client.query<TeamRow>(`update team set status = 'archived' where id = $1 returning *`, [
        input.teamId,
      ]);

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'team',
        entityId: anterior.id,
        fieldChanged: 'status',
        oldValue: { status: anterior.status },
        newValue: { status: 'archived' },
      });

      return updated[0];
    });
  }

  async listar(organizationId: string, opciones: { seasonId?: string; status?: TeamStatus } = {}): Promise<TeamRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      const condiciones: string[] = [];
      const params: unknown[] = [];
      if (opciones.seasonId) {
        params.push(opciones.seasonId);
        condiciones.push(`season_id = $${params.length}`);
      }
      if (opciones.status) {
        params.push(opciones.status);
        condiciones.push(`status = $${params.length}`);
      }
      const whereClause = condiciones.length > 0 ? `where ${condiciones.join(' and ')}` : '';
      const { rows } = await client.query<TeamRow>(`select * from team ${whereClause} order by name`, params);
      return rows;
    });
  }

  async obtenerPorId(organizationId: string, teamId: string): Promise<TeamRow | null> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<TeamRow>(`select * from team where id = $1`, [teamId]);
      return rows[0] ?? null;
    });
  }

  private esViolacionDeFk(e: unknown): boolean {
    return typeof e === 'object' && e !== null && (e as { code?: string }).code === '23503';
  }
}
