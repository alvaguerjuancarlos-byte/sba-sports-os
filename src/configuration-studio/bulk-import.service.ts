import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import { crearDimensionEnTransaccion, crearVersionProductoEnTransaccion } from './configuration-studio.operations.js';
import { generarCsv } from './csv.util.js';
import type { DimensionType } from './configuration-studio.types.js';

export type EntidadImportable = 'financial_dimension' | 'product_catalog';

export interface ImportarLoteInput {
  organizationId: string;
  actorUserId: string;
  entidad: EntidadImportable;
  filas: Record<string, string>[];
}

export interface ImportarFilaResultado {
  fila: number;
  ok: boolean;
  id?: string;
  error?: string;
}

export interface ImportarLoteResultado {
  totalFilas: number;
  exitosas: number;
  fallidas: number;
  resultados: ImportarFilaResultado[];
}

// UC-CFG-03 — Importar/exportar catálogo o dimensión.
@Injectable()
export class BulkImportService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

  // "El sistema valida cada fila contra las mismas reglas del alta individual (UC-CFG-01/02) y
  // reporta errores fila por fila sin abortar el lote completo." Cada fila corre en su propia
  // transacción — Postgres aborta toda la transacción en curso ante cualquier error, así que
  // aislar cada fila es lo único que permite que un error en una no tumbe a las demás.
  //
  // "audit_log (una entrada por importación, no por fila)" — a diferencia del alta individual, las
  // operaciones de fila aquí NO generan su propia entrada de auditoría; solo se registra un
  // resumen del lote al final.
  async importarLote(input: ImportarLoteInput): Promise<ImportarLoteResultado> {
    const resultados: ImportarFilaResultado[] = [];

    for (const [index, fila] of input.filas.entries()) {
      try {
        const id = await this.db.withTenant(input.organizationId, async (client) => {
          if (input.entidad === 'financial_dimension') {
            const dimension = await crearDimensionEnTransaccion(client, {
              organizationId: input.organizationId,
              type: fila.type as DimensionType,
              name: fila.name,
              parentId: fila.parent_id || null,
            });
            return dimension.id;
          }
          const version = await crearVersionProductoEnTransaccion(client, {
            organizationId: input.organizationId,
            productKey: fila.product_key || null,
            name: fila.name,
            price: fila.price,
            financialDimensionId: fila.financial_dimension_id || null,
            effectiveDate: fila.effective_date,
          });
          return version.id;
        });
        resultados.push({ fila: index + 1, ok: true, id });
      } catch (e) {
        resultados.push({ fila: index + 1, ok: false, error: e instanceof Error ? e.message : 'Error desconocido' });
      }
    }

    const exitosas = resultados.filter((r) => r.ok).length;
    const fallidas = resultados.length - exitosas;

    await this.db.withTenant(input.organizationId, async (client) => {
      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'bulk_import',
        entityId: randomUUID(),
        newValue: { entidad: input.entidad, totalFilas: input.filas.length, exitosas, fallidas },
      });
    });

    return { totalFilas: input.filas.length, exitosas, fallidas, resultados };
  }

  // "exporta el catálogo actual para respaldo/edición externa" — catálogo activo vigente, no el
  // histórico completo (consistente con el criterio de aceptación de UC-CFG-02).
  async exportarCsv(organizationId: string, entidad: EntidadImportable): Promise<string> {
    return this.db.withTenant(organizationId, async (client) => {
      if (entidad === 'financial_dimension') {
        const { rows } = await client.query(`select id, type, name, parent_id, status from financial_dimension order by type, name`);
        return generarCsv(['id', 'type', 'name', 'parent_id', 'status'], rows);
      }
      const { rows } = await client.query(
        `select id, product_key, name, price, financial_dimension_id, effective_date, effective_until, status
         from product_catalog where status = 'active' and effective_until is null order by name`,
      );
      return generarCsv(
        ['id', 'product_key', 'name', 'price', 'financial_dimension_id', 'effective_date', 'effective_until', 'status'],
        rows,
      );
    });
  }
}
