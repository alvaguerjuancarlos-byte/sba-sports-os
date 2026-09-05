import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { InventoryCheckoutService } from './inventory-checkout.service.js';
import { crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'coach-1';
const ITEM_ID = 'item-1';

function inventoryItemServiceFalso(item: Record<string, unknown> | null) {
  return { obtenerPorId: vi.fn().mockResolvedValue(item) };
}

// UC-FAC-02 / UC-FAC-03 — un test por criterio de aceptación textual.
describe('InventoryCheckoutService', () => {
  describe('checkout', () => {
    it('rechaza quantity menor o igual a cero', async () => {
      const db = crearDbFalsa(crearClientFalso([]));
      const service = new InventoryCheckoutService(db as never, inventoryItemServiceFalso(null) as never);

      await expect(
        service.checkout({ organizationId: ORG_ID, actorUserId: ACTOR_ID, inventoryItemId: ITEM_ID, quantity: 0 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza NotFoundException si el inventory_item no existe', async () => {
      const db = crearDbFalsa(crearClientFalso([]));
      const service = new InventoryCheckoutService(db as never, inventoryItemServiceFalso(null) as never);

      await expect(
        service.checkout({ organizationId: ORG_ID, actorUserId: ACTOR_ID, inventoryItemId: 'no-existe', quantity: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rechaza el check-out de material archivado', async () => {
      const db = crearDbFalsa(crearClientFalso([]));
      const service = new InventoryCheckoutService(db as never, inventoryItemServiceFalso({ id: ITEM_ID, status: 'archived', quantity_total: 10 }) as never);

      await expect(
        service.checkout({ organizationId: ORG_ID, actorUserId: ACTOR_ID, inventoryItemId: ITEM_ID, quantity: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('bloquea el check-out si la cantidad excede la disponible, mostrando la cifra real disponible', async () => {
      const item = { id: ITEM_ID, status: 'active', quantity_total: 10 };
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select coalesce\(sum\(quantity\)/i, rows: [{ total: '8' }] }]));
      const service = new InventoryCheckoutService(db as never, inventoryItemServiceFalso(item) as never);

      // disponible = 10 - 8 = 2; se solicitan 5
      await expect(
        service.checkout({ organizationId: ORG_ID, actorUserId: ACTOR_ID, inventoryItemId: ITEM_ID, quantity: 5 }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ disponible: 2 }),
      });
    });

    it('la disponibilidad siempre resta los check-outs abiertos, no solo el total físico', async () => {
      const item = { id: ITEM_ID, status: 'active', quantity_total: 10 };
      const stubs: QueryStub[] = [
        { matcher: /select coalesce\(sum\(quantity\)/i, rows: [{ total: '4' }] },
        { matcher: /insert into inventory_checkout/i, rows: [{ id: 'checkout-1', quantity: 6 }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new InventoryCheckoutService(db as never, inventoryItemServiceFalso(item) as never);

      // disponible = 10 - 4 = 6; se solicitan exactamente 6, debe caber
      const resultado = await service.checkout({ organizationId: ORG_ID, actorUserId: ACTOR_ID, inventoryItemId: ITEM_ID, quantity: 6 });

      expect(resultado.quantity).toBe(6);
    });
  });

  describe('devolver', () => {
    it('lanza NotFoundException si el checkout no existe', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from inventory_checkout where id/i, rows: [] }]));
      const service = new InventoryCheckoutService(db as never, inventoryItemServiceFalso(null) as never);

      await expect(service.devolver({ organizationId: ORG_ID, actorUserId: ACTOR_ID, checkoutId: 'no-existe' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rechaza devolver un checkout ya devuelto', async () => {
      const db = crearDbFalsa(
        crearClientFalso([{ matcher: /select \* from inventory_checkout where id/i, rows: [{ id: 'checkout-1', returned_at: '2026-01-01T00:00:00Z' }] }]),
      );
      const service = new InventoryCheckoutService(db as never, inventoryItemServiceFalso(null) as never);

      await expect(service.devolver({ organizationId: ORG_ID, actorUserId: ACTOR_ID, checkoutId: 'checkout-1' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('registra returned_at, liberando la cantidad para el siguiente check-out', async () => {
      const stubs: QueryStub[] = [
        { matcher: /select \* from inventory_checkout where id/i, rows: [{ id: 'checkout-1', returned_at: null }] },
        { matcher: /update inventory_checkout set returned_at = now/i, rows: [{ id: 'checkout-1', returned_at: '2026-06-01T00:00:00Z' }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new InventoryCheckoutService(db as never, inventoryItemServiceFalso(null) as never);

      const resultado = await service.devolver({ organizationId: ORG_ID, actorUserId: ACTOR_ID, checkoutId: 'checkout-1' });

      expect(resultado.returned_at).not.toBeNull();
    });
  });

  describe('consultarDisponibilidad', () => {
    it('regresa la disponibilidad calculada por item de la sede', async () => {
      const db = crearDbFalsa(
        crearClientFalso([{ matcher: /from inventory_item i/i, rows: [{ id: ITEM_ID, name: 'Balones', quantity_total: 10, disponible: 6 }] }]),
      );
      const service = new InventoryCheckoutService(db as never, inventoryItemServiceFalso(null) as never);

      const resultado = await service.consultarDisponibilidad(ORG_ID, 'venue-1');

      expect(resultado[0].disponible).toBe(6);
    });
  });

  describe('listarPendientesDeDevolucion', () => {
    it('regresa solo los checkouts sin returned_at — nunca se pierden de vista silenciosamente', async () => {
      const db = crearDbFalsa(
        crearClientFalso([{ matcher: /where returned_at is null/i, rows: [{ id: 'checkout-1', returned_at: null }] }]),
      );
      const service = new InventoryCheckoutService(db as never, inventoryItemServiceFalso(null) as never);

      const resultado = await service.listarPendientesDeDevolucion(ORG_ID);

      expect(resultado).toHaveLength(1);
    });
  });
});
