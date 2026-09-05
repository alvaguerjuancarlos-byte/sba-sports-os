import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import type { InventoryItemRow, InventoryItemStatus } from './facilities-inventory.types.js';

export interface CrearInventoryItemInput {
  organizationId: string;
  actorUserId: string;
  venueId: string;
  name: string;
  category: string;
  quantityTotal: number;
}

export interface ArchivarInventoryItemInput {
  organizationId: string;
  actorUserId: string;
  inventoryItemId: string;
}

// UC-FAC-01 — Alta de inventario por sede. Base para el check-out (UC-FAC-02) y la consulta de
// disponibilidad (UC-FAC-03).
@Injectable()
export class InventoryItemService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

  async crear(input: CrearInventoryItemInput): Promise<InventoryItemRow> {
    if (input.quantityTotal <= 0) {
      throw new BadRequestException('quantity_total debe ser mayor a cero.');
    }

    return this.db.withTenant(input.organizationId, async (client) => {
      let item: InventoryItemRow;
      try {
        const { rows } = await client.query<InventoryItemRow>(
          `insert into inventory_item (organization_id, venue_id, name, category, quantity_total, status)
           values ($1, $2, $3, $4, $5, 'active')
           returning *`,
          [input.organizationId, input.venueId, input.name, input.category, input.quantityTotal],
        );
        item = rows[0];
      } catch (e) {
        if (this.esViolacionDeFk(e)) throw new NotFoundException('El venue indicado no existe.');
        throw e;
      }

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'inventory_item',
        entityId: item.id,
        newValue: { venueId: item.venue_id, name: item.name, category: item.category, quantityTotal: item.quantity_total },
      });

      return item;
    });
  }

  async archivar(input: ArchivarInventoryItemInput): Promise<InventoryItemRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<InventoryItemRow>(`select * from inventory_item where id = $1`, [
        input.inventoryItemId,
      ]);
      const anterior = rows[0];
      if (!anterior) throw new NotFoundException('inventory_item no encontrado.');

      const { rows: updated } = await client.query<InventoryItemRow>(
        `update inventory_item set status = 'archived' where id = $1 returning *`,
        [input.inventoryItemId],
      );

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'inventory_item',
        entityId: anterior.id,
        fieldChanged: 'status',
        oldValue: { status: anterior.status },
        newValue: { status: 'archived' },
      });

      return updated[0];
    });
  }

  async listar(organizationId: string, opciones: { venueId?: string; status?: InventoryItemStatus } = {}): Promise<InventoryItemRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      const condiciones: string[] = [];
      const params: unknown[] = [];
      if (opciones.venueId) {
        params.push(opciones.venueId);
        condiciones.push(`venue_id = $${params.length}`);
      }
      if (opciones.status) {
        params.push(opciones.status);
        condiciones.push(`status = $${params.length}`);
      }
      const whereClause = condiciones.length > 0 ? `where ${condiciones.join(' and ')}` : '';
      const { rows } = await client.query<InventoryItemRow>(`select * from inventory_item ${whereClause} order by name`, params);
      return rows;
    });
  }

  async obtenerPorId(organizationId: string, inventoryItemId: string): Promise<InventoryItemRow | null> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<InventoryItemRow>(`select * from inventory_item where id = $1`, [inventoryItemId]);
      return rows[0] ?? null;
    });
  }

  private esViolacionDeFk(e: unknown): boolean {
    return typeof e === 'object' && e !== null && (e as { code?: string }).code === '23503';
  }
}
