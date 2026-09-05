import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { InventoryItemService } from './inventory-item.service.js';
import type { DisponibilidadItem, InventoryCheckoutRow } from './facilities-inventory.types.js';

export interface CheckoutInput {
  organizationId: string;
  actorUserId: string;
  inventoryItemId: string;
  quantity: number;
}

export interface DevolverInput {
  organizationId: string;
  actorUserId: string;
  checkoutId: string;
}

// UC-FAC-02 — Check-out de material autorizado. UC-FAC-03 — Consultar disponibilidad de inventario.
@Injectable()
export class InventoryCheckoutService {
  constructor(
    private readonly db: DatabaseService,
    private readonly inventoryItemService: InventoryItemService,
  ) {}

  async checkout(input: CheckoutInput): Promise<InventoryCheckoutRow> {
    if (input.quantity <= 0) {
      throw new BadRequestException('quantity debe ser mayor a cero.');
    }

    const item = await this.inventoryItemService.obtenerPorId(input.organizationId, input.inventoryItemId);
    if (!item) throw new NotFoundException('inventory_item no encontrado.');
    if (item.status === 'archived') {
      throw new BadRequestException('Este material está archivado — no se puede hacer check-out.');
    }

    return this.db.withTenant(input.organizationId, async (client) => {
      // Criterio de aceptación: "la disponibilidad mostrada siempre resta los check-outs
      // abiertos, no solo el total físico registrado."
      const { rows: abiertos } = await client.query<{ total: string }>(
        `select coalesce(sum(quantity), 0) as total from inventory_checkout where inventory_item_id = $1 and returned_at is null`,
        [input.inventoryItemId],
      );
      const disponible = item.quantity_total - Number(abiertos[0].total);

      // 2a. "La cantidad solicitada excede la disponible → el sistema bloquea el check-out y
      // muestra cuánto hay realmente disponible en ese momento (no una cifra desactualizada)."
      if (input.quantity > disponible) {
        throw new ConflictException({
          message: `Cantidad solicitada (${input.quantity}) excede la disponible (${disponible}).`,
          disponible,
        });
      }

      const { rows } = await client.query<InventoryCheckoutRow>(
        `insert into inventory_checkout (organization_id, inventory_item_id, checked_out_by, quantity, checked_out_at)
         values ($1, $2, $3, $4, now())
         returning *`,
        [input.organizationId, input.inventoryItemId, input.actorUserId, input.quantity],
      );
      return rows[0];
    });
  }

  // 4. "Al devolver el material, se registra returned_at, liberando la cantidad para el
  // siguiente check-out."
  async devolver(input: DevolverInput): Promise<InventoryCheckoutRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<InventoryCheckoutRow>(`select * from inventory_checkout where id = $1`, [
        input.checkoutId,
      ]);
      const checkout = rows[0];
      if (!checkout) throw new NotFoundException('inventory_checkout no encontrado.');
      if (checkout.returned_at) {
        throw new ConflictException('Este material ya fue devuelto.');
      }

      const { rows: updated } = await client.query<InventoryCheckoutRow>(
        `update inventory_checkout set returned_at = now() where id = $1 returning *`,
        [input.checkoutId],
      );
      return updated[0];
    });
  }

  // UC-FAC-03 — "qué material existe y cuánto está disponible en este momento (quantity_total
  // menos check-outs abiertos)."
  async consultarDisponibilidad(organizationId: string, venueId: string): Promise<DisponibilidadItem[]> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<DisponibilidadItem>(
        `select i.*,
                i.quantity_total - coalesce(
                  (select sum(quantity) from inventory_checkout where inventory_item_id = i.id and returned_at is null),
                  0
                ) as disponible
         from inventory_item i
         where i.venue_id = $1 and i.status = 'active'
         order by i.name`,
        [venueId],
      );
      return rows;
    });
  }

  // Criterio de aceptación UC-FAC-02: "todo inventory_checkout sin returned_at es visible en un
  // reporte de material pendiente de devolución — nunca se pierde de vista silenciosamente."
  async listarPendientesDeDevolucion(organizationId: string): Promise<InventoryCheckoutRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<InventoryCheckoutRow>(
        `select * from inventory_checkout where returned_at is null order by checked_out_at`,
      );
      return rows;
    });
  }
}
