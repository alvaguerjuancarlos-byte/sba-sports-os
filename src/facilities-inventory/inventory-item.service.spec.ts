import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryItemService } from './inventory-item.service.js';
import { crearAuditLogFalso, crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'admin-1';

// UC-FAC-01 — un test por criterio de aceptación textual.
describe('InventoryItemService', () => {
  let auditLog: ReturnType<typeof crearAuditLogFalso>;

  beforeEach(() => {
    auditLog = crearAuditLogFalso();
  });

  describe('crear', () => {
    it('rechaza quantity_total menor o igual a cero', async () => {
      const db = crearDbFalsa(crearClientFalso([]));
      const service = new InventoryItemService(db as never, auditLog as never);

      await expect(
        service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, venueId: 'venue-1', name: 'Balones', category: 'Deportivo', quantityTotal: 0 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('requiere que el venue exista — violación de FK se traduce a NotFoundException', async () => {
      const client = crearClientFalso([]);
      (client.query as ReturnType<typeof vi.fn>).mockImplementation((sql: string) => {
        if (/insert into inventory_item/i.test(sql)) return Promise.reject(Object.assign(new Error('fk violation'), { code: '23503' }));
        throw new Error(`Query sin stub configurado: ${sql}`);
      });
      const db = crearDbFalsa(client);
      const service = new InventoryItemService(db as never, auditLog as never);

      await expect(
        service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, venueId: 'no-existe', name: 'Balones', category: 'Deportivo', quantityTotal: 10 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('crea el item y lo audita', async () => {
      const stubs: QueryStub[] = [
        { matcher: /insert into inventory_item/i, rows: [{ id: 'item-1', venue_id: 'venue-1', name: 'Balones', category: 'Deportivo', quantity_total: 10, status: 'active' }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new InventoryItemService(db as never, auditLog as never);

      const resultado = await service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, venueId: 'venue-1', name: 'Balones', category: 'Deportivo', quantityTotal: 10 });

      expect(resultado.quantity_total).toBe(10);
      expect(auditLog.record).toHaveBeenCalledOnce();
    });
  });

  describe('archivar', () => {
    it('lanza NotFoundException si no existe', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from inventory_item where id/i, rows: [] }]));
      const service = new InventoryItemService(db as never, auditLog as never);

      await expect(service.archivar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, inventoryItemId: 'no-existe' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('archiva sin borrar', async () => {
      const anterior = { id: 'item-1', status: 'active' };
      const stubs: QueryStub[] = [
        { matcher: /select \* from inventory_item where id/i, rows: [anterior] },
        { matcher: /update inventory_item set status = 'archived'/i, rows: [{ ...anterior, status: 'archived' }] },
      ];
      const client = crearClientFalso(stubs);
      const db = crearDbFalsa(client);
      const service = new InventoryItemService(db as never, auditLog as never);

      const resultado = await service.archivar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, inventoryItemId: 'item-1' });

      expect(resultado.status).toBe('archived');
      const llamadasDelete = (client.query as ReturnType<typeof vi.fn>).mock.calls.filter(([sql]: [string]) => /delete/i.test(sql));
      expect(llamadasDelete).toHaveLength(0);
    });
  });

  describe('obtenerPorId', () => {
    it('regresa null si no existe', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from inventory_item where id/i, rows: [] }]));
      const service = new InventoryItemService(db as never, auditLog as never);

      await expect(service.obtenerPorId(ORG_ID, 'no-existe')).resolves.toBeNull();
    });
  });
});
