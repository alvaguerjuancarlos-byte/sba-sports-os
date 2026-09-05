import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import { rangosSeSolapan, type SeasonRow, type SeasonStatus } from './sports-hub.types.js';

export interface CrearSeasonInput {
  organizationId: string;
  actorUserId: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface CrearSeasonResultado {
  season: SeasonRow;
  solapamientos: SeasonRow[];
}

export interface CerrarSeasonInput {
  organizationId: string;
  actorUserId: string;
  seasonId: string;
}

// UC-SPT-01 — Crear temporada.
@Injectable()
export class SeasonService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

  async crear(input: CrearSeasonInput): Promise<CrearSeasonResultado> {
    if (input.endDate < input.startDate) {
      throw new BadRequestException('end_date no puede ser anterior a start_date.');
    }

    return this.db.withTenant(input.organizationId, async (client) => {
      // "No se solapan dos temporadas activas... sin confirmación explícita (aviso, no bloqueo)"
      // — se avisa de las que se solapan, pero la creación nunca se bloquea por esto.
      const { rows: activas } = await client.query<SeasonRow>(`select * from season where status = 'active'`);
      const solapamientos = activas.filter((s) => rangosSeSolapan(input.startDate, input.endDate, s.start_date, s.end_date));

      const { rows } = await client.query<SeasonRow>(
        `insert into season (organization_id, name, start_date, end_date, status)
         values ($1, $2, $3, $4, 'active')
         returning *`,
        [input.organizationId, input.name, input.startDate, input.endDate],
      );
      const season = rows[0];

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'season',
        entityId: season.id,
        newValue: { name: season.name, startDate: season.start_date, endDate: season.end_date },
      });

      return { season, solapamientos };
    });
  }

  async cerrar(input: CerrarSeasonInput): Promise<SeasonRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<SeasonRow>(`select * from season where id = $1`, [input.seasonId]);
      const anterior = rows[0];
      if (!anterior) throw new NotFoundException('season no encontrada.');

      const { rows: updated } = await client.query<SeasonRow>(
        `update season set status = 'closed' where id = $1 returning *`,
        [input.seasonId],
      );

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'season',
        entityId: anterior.id,
        fieldChanged: 'status',
        oldValue: { status: anterior.status },
        newValue: { status: 'closed' },
      });

      return updated[0];
    });
  }

  async listar(organizationId: string, opciones: { status?: SeasonStatus } = {}): Promise<SeasonRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      if (opciones.status) {
        const { rows } = await client.query<SeasonRow>(`select * from season where status = $1 order by start_date desc`, [
          opciones.status,
        ]);
        return rows;
      }
      const { rows } = await client.query<SeasonRow>(`select * from season order by start_date desc`);
      return rows;
    });
  }
}
