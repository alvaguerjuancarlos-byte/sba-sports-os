import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import type { VenueRow, VenueStatus } from './calendar-rsvp.types.js';

export interface CrearVenueInput {
  organizationId: string;
  actorUserId: string;
  name: string;
}

export interface ArchivarVenueInput {
  organizationId: string;
  actorUserId: string;
  venueId: string;
}

// [propuesto] — sin caso de uso propio en el documento fuente; UC-CAL-01 lo asume como
// precondición ("el venue está dado de alta"). Alta/archivado mínimo, mismo principio de
// no-borrado del resto del sistema.
@Injectable()
export class VenueService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

  async crear(input: CrearVenueInput): Promise<VenueRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<VenueRow>(
        `insert into venue (organization_id, name, status) values ($1, $2, 'active') returning *`,
        [input.organizationId, input.name],
      );
      const venue = rows[0];

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'venue',
        entityId: venue.id,
        newValue: { name: venue.name },
      });

      return venue;
    });
  }

  async archivar(input: ArchivarVenueInput): Promise<VenueRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<VenueRow>(`select * from venue where id = $1`, [input.venueId]);
      const anterior = rows[0];
      if (!anterior) throw new NotFoundException('venue no encontrado.');

      const { rows: updated } = await client.query<VenueRow>(`update venue set status = 'archived' where id = $1 returning *`, [
        input.venueId,
      ]);

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'venue',
        entityId: anterior.id,
        fieldChanged: 'status',
        oldValue: { status: anterior.status },
        newValue: { status: 'archived' },
      });

      return updated[0];
    });
  }

  async listar(organizationId: string, opciones: { status?: VenueStatus } = {}): Promise<VenueRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      if (opciones.status) {
        const { rows } = await client.query<VenueRow>(`select * from venue where status = $1 order by name`, [opciones.status]);
        return rows;
      }
      const { rows } = await client.query<VenueRow>(`select * from venue order by name`);
      return rows;
    });
  }
}
