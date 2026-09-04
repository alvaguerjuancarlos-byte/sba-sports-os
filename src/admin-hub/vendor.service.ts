import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import type { AdminHubStatus, VendorRow } from './admin-hub.types.js';

export interface CrearVendorInput {
  organizationId: string;
  actorUserId: string;
  name: string;
  taxId?: string | null;
}

export interface ArchivarVendorInput {
  organizationId: string;
  actorUserId: string;
  vendorId: string;
}

// UC-ADM-06 — Alta de vendor. "Editable/archivable con el mismo principio de no-borrado que
// Configuration Studio."
@Injectable()
export class VendorService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

  async crear(input: CrearVendorInput): Promise<VendorRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<VendorRow>(
        `insert into vendor (organization_id, name, tax_id, status) values ($1, $2, $3, 'active') returning *`,
        [input.organizationId, input.name, input.taxId ?? null],
      );
      const vendor = rows[0];

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'vendor',
        entityId: vendor.id,
        newValue: { name: vendor.name, taxId: vendor.tax_id },
      });

      return vendor;
    });
  }

  async archivar(input: ArchivarVendorInput): Promise<VendorRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<VendorRow>(`select * from vendor where id = $1`, [input.vendorId]);
      const anterior = rows[0];
      if (!anterior) throw new NotFoundException('vendor no encontrado.');

      const { rows: updated } = await client.query<VendorRow>(
        `update vendor set status = 'archived' where id = $1 returning *`,
        [input.vendorId],
      );

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'vendor',
        entityId: anterior.id,
        fieldChanged: 'status',
        oldValue: { status: anterior.status },
        newValue: { status: 'archived' },
      });

      return updated[0];
    });
  }

  async listar(organizationId: string, opciones: { status?: AdminHubStatus } = {}): Promise<VendorRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      if (opciones.status) {
        const { rows } = await client.query<VendorRow>(`select * from vendor where status = $1 order by name`, [
          opciones.status,
        ]);
        return rows;
      }
      const { rows } = await client.query<VendorRow>(`select * from vendor order by name`);
      return rows;
    });
  }
}
