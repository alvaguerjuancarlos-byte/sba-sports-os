import { Injectable, NotFoundException } from '@nestjs/common';
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

export interface ActualizarQualifyingForBlockInput {
  organizationId: string;
  actorUserId: string;
  dimensionId: string;
  isQualifyingForBlock: boolean;
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

  // Lectura por id para consumidores de otros dominios (ej. Payments & Billing, UC-PAY-05) — así
  // ese dominio nunca hace SELECT directo contra la tabla de este, siempre vía este servicio.
  async obtenerPorId(organizationId: string, dimensionId: string): Promise<FinancialDimensionRow | null> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<FinancialDimensionRow>(`select * from financial_dimension where id = $1`, [
        dimensionId,
      ]);
      return rows[0] ?? null;
    });
  }

  // UC-PAY-05 depende de esta bandera para saber qué tipo de cargo vencido bloquea convocatoria —
  // no forma parte de UC-CFG-01..04, se agrega aquí porque Configuration Studio es quien la posee
  // y la expone (ver db/migrations/0004_payments_billing_init.sql).
  async actualizarQualifyingForBlock(input: ActualizarQualifyingForBlockInput): Promise<FinancialDimensionRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<FinancialDimensionRow>(`select * from financial_dimension where id = $1`, [
        input.dimensionId,
      ]);
      const anterior = rows[0];
      if (!anterior) throw new NotFoundException('financial_dimension no encontrada.');

      const { rows: updated } = await client.query<FinancialDimensionRow>(
        `update financial_dimension set is_qualifying_for_block = $2 where id = $1 returning *`,
        [input.dimensionId, input.isQualifyingForBlock],
      );

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'financial_dimension',
        entityId: anterior.id,
        fieldChanged: 'is_qualifying_for_block',
        oldValue: { isQualifyingForBlock: anterior.is_qualifying_for_block },
        newValue: { isQualifyingForBlock: input.isQualifyingForBlock },
      });

      return updated[0];
    });
  }
}
