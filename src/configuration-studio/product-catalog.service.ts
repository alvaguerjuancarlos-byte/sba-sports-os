import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import { archivarProductoEnTransaccion, crearVersionProductoEnTransaccion } from './configuration-studio.operations.js';
import type { ProductCatalogRow } from './configuration-studio.types.js';

export interface CrearVersionProductoInput {
  organizationId: string;
  actorUserId: string;
  productKey?: string | null;
  name: string;
  price: string | number;
  financialDimensionId?: string | null;
  effectiveDate: string;
  attributes?: Record<string, unknown> | null;
}

export interface ArchivarProductoInput {
  organizationId: string;
  actorUserId: string;
  productKey: string;
}

// UC-CFG-02 — Crear/editar producto o servicio del catálogo.
@Injectable()
export class ProductCatalogService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

  async crearVersion(input: CrearVersionProductoInput): Promise<ProductCatalogRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const version = await crearVersionProductoEnTransaccion(client, input);

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'product_catalog',
        entityId: version.id,
        newValue: {
          productKey: version.product_key,
          name: version.name,
          price: version.price,
          effectiveDate: version.effective_date,
        },
      });

      return version;
    });
  }

  async archivar(input: ArchivarProductoInput): Promise<ProductCatalogRow[]> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const versiones = await archivarProductoEnTransaccion(client, input.productKey);

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'product_catalog',
        entityId: versiones[0].id,
        fieldChanged: 'status',
        newValue: { status: 'archived', productKey: input.productKey },
      });

      return versiones;
    });
  }

  // Criterio de aceptación UC-CFG-02: "el catálogo activo siempre refleja solo productos no
  // archivados a menos que se pida explícitamente ver el histórico" — solo la versión vigente
  // (effective_until is null) de productos no archivados.
  async listarActivos(organizationId: string): Promise<ProductCatalogRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<ProductCatalogRow>(
        `select * from product_catalog where status = 'active' and effective_until is null order by name`,
      );
      return rows;
    });
  }

  async listarHistorico(organizationId: string, productKey: string): Promise<ProductCatalogRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<ProductCatalogRow>(
        `select * from product_catalog where product_key = $1 order by effective_date`,
        [productKey],
      );
      return rows;
    });
  }
}
