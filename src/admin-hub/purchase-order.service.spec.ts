import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PurchaseOrderService } from './purchase-order.service.js';
import { crearAuditLogFalso, crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'admin-1';
const PR_ID = 'pr-1';
const VENDOR_ID = 'vendor-1';

// UC-ADM-04 — un test por criterio de aceptación textual.
describe('PurchaseOrderService', () => {
  let auditLog: ReturnType<typeof crearAuditLogFalso>;

  beforeEach(() => {
    auditLog = crearAuditLogFalso();
  });

  it('lanza NotFoundException si la purchase_request no existe', async () => {
    const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from purchase_request where id/i, rows: [] }]));
    const service = new PurchaseOrderService(db as never, auditLog as never);

    await expect(
      service.emitir({ organizationId: ORG_ID, actorUserId: ACTOR_ID, purchaseRequestId: 'no-existe', vendorId: VENDOR_ID }),
    ).rejects.toThrow(NotFoundException);
  });

  it('solo se puede emitir una orden de compra para una solicitud aprobada', async () => {
    const db = crearDbFalsa(
      crearClientFalso([{ matcher: /select \* from purchase_request where id/i, rows: [{ id: PR_ID, status: 'pending', amount: '500', budget_line_id: 'bl-1' }] }]),
    );
    const service = new PurchaseOrderService(db as never, auditLog as never);

    await expect(
      service.emitir({ organizationId: ORG_ID, actorUserId: ACTOR_ID, purchaseRequestId: PR_ID, vendorId: VENDOR_ID }),
    ).rejects.toThrow(ConflictException);
  });

  it('requiere que el vendor ya exista — violación de FK se traduce a NotFoundException', async () => {
    const solicitud = { id: PR_ID, status: 'approved', amount: '500', budget_line_id: 'bl-1' };
    const client = crearClientFalso([{ matcher: /select \* from purchase_request where id/i, rows: [solicitud] }]);
    (client.query as ReturnType<typeof vi.fn>).mockImplementation((sql: string) => {
      if (/select \* from purchase_request where id/i.test(sql)) return Promise.resolve({ rows: [solicitud] });
      if (/insert into purchase_order/i.test(sql)) return Promise.reject(Object.assign(new Error('fk violation'), { code: '23503' }));
      throw new Error(`Query sin stub configurado: ${sql}`);
    });
    const db = crearDbFalsa(client);
    const service = new PurchaseOrderService(db as never, auditLog as never);

    await expect(
      service.emitir({ organizationId: ORG_ID, actorUserId: ACTOR_ID, purchaseRequestId: PR_ID, vendorId: 'no-existe' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('no permite emitir dos órdenes de compra para la misma solicitud', async () => {
    const solicitud = { id: PR_ID, status: 'approved', amount: '500', budget_line_id: 'bl-1' };
    const client = crearClientFalso([{ matcher: /select \* from purchase_request where id/i, rows: [solicitud] }]);
    (client.query as ReturnType<typeof vi.fn>).mockImplementation((sql: string) => {
      if (/select \* from purchase_request where id/i.test(sql)) return Promise.resolve({ rows: [solicitud] });
      if (/insert into purchase_order/i.test(sql)) return Promise.reject(Object.assign(new Error('duplicate key'), { code: '23505' }));
      throw new Error(`Query sin stub configurado: ${sql}`);
    });
    const db = crearDbFalsa(client);
    const service = new PurchaseOrderService(db as never, auditLog as never);

    await expect(
      service.emitir({ organizationId: ORG_ID, actorUserId: ACTOR_ID, purchaseRequestId: PR_ID, vendorId: VENDOR_ID }),
    ).rejects.toThrow(ConflictException);
  });

  it('crea la PO y un commitment abierto con el mismo monto, y lo audita', async () => {
    const solicitud = { id: PR_ID, status: 'approved', amount: '500.00', budget_line_id: 'bl-1' };
    const purchaseOrder = { id: 'po-1', purchase_request_id: PR_ID, vendor_id: VENDOR_ID, amount: '500.00' };
    const stubs: QueryStub[] = [
      { matcher: /select \* from purchase_request where id/i, rows: [solicitud] },
      { matcher: /insert into purchase_order/i, rows: [purchaseOrder] },
      { matcher: /insert into commitment/i, rows: [{ id: 'commit-1', purchase_order_id: 'po-1', budget_line_id: 'bl-1', amount: '500.00', status: 'open' }] },
    ];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new PurchaseOrderService(db as never, auditLog as never);

    const resultado = await service.emitir({ organizationId: ORG_ID, actorUserId: ACTOR_ID, purchaseRequestId: PR_ID, vendorId: VENDOR_ID });

    expect(resultado.commitment.status).toBe('open');
    expect(resultado.commitment.amount).toBe(resultado.purchaseOrder.amount);
    expect(auditLog.record).toHaveBeenCalledOnce();
  });
});
