import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import { archivarDimensionEnTransaccion, crearDimensionEnTransaccion } from './configuration-studio.operations.js';
import type { CfgStatus, DimensionType, FinancialDimensionRow } from './configuration-studio.types.js';

export interface CrearDimensionInput {
  organizationId: string;
  actorUserId: string;
  type: DimensionType;
  name: string;
  parentId?: string | null;
}

export interface ArchivarDimensionInput {
  organizationId: string;
  actorUserId: string;
  dimensionId: string;
}

// UC-CFG-01 — Crear/editar/archivar dimensión financiera.
@Injectable()
export class FinancialDimensionsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

  async crear(input: CrearDimensionInput): Promise<FinancialDimensionRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const dimension = await crearDimensionEnTransaccion(client, input);

      // Criterio de aceptación: "El cambio de una dimensión (crear/editar/archivar) queda en
      // audit_log con antes/después."
      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'financial_dimension',
        entityId: dimension.id,
        newValue: { type: dimension.type, name: dimension.name, parentId: dimension.parent_id, status: dimension.status },
      });

      return dimension;
    });
  }

  async archivar(input: ArchivarDimensionInput): Promise<FinancialDimensionRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { anterior, actualizada } = await archivarDimensionEnTransaccion(client, input.dimensionId);

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'financial_dimension',
        entityId: anterior.id,
        fieldChanged: 'status',
        oldValue: { status: anterior.status },
        newValue: { status: 'archived' },
      });

      return actualizada;
    });
  }

  // Soporte de lectura para "la dimensión queda disponible inmediatamente" — sin filtro regresa
  // todo (incluye archivadas), con status filtra explícitamente.
  async listar(organizationId: string, opciones: { status?: CfgStatus } = {}): Promise<FinancialDimensionRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      if (opciones.status) {
        const { rows } = await client.query<FinancialDimensionRow>(
          `select * from financial_dimension where status = $1 order by type, name`,
          [opciones.status],
        );
        return rows;
      }
      const { rows } = await client.query<FinancialDimensionRow>(`select * from financial_dimension order by type, name`);
      return rows;
    });
  }
}
