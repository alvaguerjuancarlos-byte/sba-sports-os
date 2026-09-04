import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ActualPostingService } from './actual-posting.service.js';
import { crearAuditLogFalso, crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'admin-1';
const PO_ID = 'po-1';

// UC-ADM-05 — un test por criterio de aceptación textual.
describe('ActualPostingService', () => {
  let auditLog: ReturnType<typeof crearAuditLogFalso>;

  beforeEach(() => {
    auditLog = crearAuditLogFalso();
  });

  it('lanza NotFoundException si no existe un commitment para esa purchase_order', async () => {
    const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from commitment where purchase_order_id/i, rows: [] }]));
    const service = new ActualPostingService(db as never, auditLog as never);

    await expect(
      service.registrar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, purchaseOrderId: 'no-existe', amount: 500 }),
    ).rejects.toThrow(NotFoundException);
  });

  it('nunca coexisten un commitment abierto y un posting que ya reconoció el mismo gasto — commitment consumed rechaza un segundo posting', async () => {
    const db = crearDbFalsa(
      crearClientFalso([{ matcher: /select \* from commitment where purchase_order_id/i, rows: [{ id: 'commit-1', status: 'consumed', budget_line_id: 'bl-1' }] }]),
    );
    const service = new ActualPostingService(db as never, auditLog as never);

    await expect(
      service.registrar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, purchaseOrderId: PO_ID, amount: 500 }),
    ).rejects.toThrow(ConflictException);
  });

  it('permite un monto real distinto del comprometido y transiciona el commitment a consumed de todas formas (alt-flow 1a)', async () => {
    const commitment = { id: 'commit-1', status: 'open', budget_line_id: 'bl-1', amount: '500.00' };
    const stubs: QueryStub[] = [
      { matcher: /select \* from commitment where purchase_order_id/i, rows: [commitment] },
      { matcher: /insert into actual_posting/i, rows: [{ id: 'ap-1', purchase_order_id: PO_ID, budget_line_id: 'bl-1', amount: '620.00' }] },
      { matcher: /update commitment set status = 'consumed'/i, rows: [{ ...commitment, status: 'consumed' }] },
    ];
    const client = crearClientFalso(stubs);
    const db = crearDbFalsa(client);
    const service = new ActualPostingService(db as never, auditLog as never);

    const resultado = await service.registrar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, purchaseOrderId: PO_ID, amount: '620.00' });

    expect(resultado.actualPosting.amount).toBe('620.00');
    expect(resultado.commitment.status).toBe('consumed');
    const llamadasEditanMontoCommitment = (client.query as ReturnType<typeof vi.fn>).mock.calls.filter(([sql]: [string]) =>
      /update commitment set amount/i.test(sql),
    );
    expect(llamadasEditanMontoCommitment).toHaveLength(0);
    expect(auditLog.record).toHaveBeenCalledOnce();
  });
});
