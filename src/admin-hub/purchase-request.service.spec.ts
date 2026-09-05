import { beforeEach, describe, expect, it } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PurchaseRequestService } from './purchase-request.service.js';
import { crearAuditLogFalso, crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'coach-1';
const BUDGET_LINE_ID = 'bl-1';

// UC-ADM-02 — un test por criterio de aceptación textual.
describe('PurchaseRequestService', () => {
  let auditLog: ReturnType<typeof crearAuditLogFalso>;

  beforeEach(() => {
    auditLog = crearAuditLogFalso();
  });

  it('lanza NotFoundException si el budget_line no existe', async () => {
    const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from budget_line where id/i, rows: [] }]));
    const service = new PurchaseRequestService(db as never, auditLog as never);

    await expect(
      service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, budgetLineId: 'no-existe', amount: 100 }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rechaza la captura si el budget_line está archivado — no permite gasto contra presupuesto inactivo', async () => {
    const db = crearDbFalsa(
      crearClientFalso([{ matcher: /select \* from budget_line where id/i, rows: [{ id: BUDGET_LINE_ID, status: 'archived', amount_budgeted: '10000' }] }]),
    );
    const service = new PurchaseRequestService(db as never, auditLog as never);

    await expect(
      service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, budgetLineId: BUDGET_LINE_ID, amount: 100 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('clasifica dentro de presupuesto cuando el monto cabe en el saldo disponible', async () => {
    const budgetLine = { id: BUDGET_LINE_ID, status: 'active', amount_budgeted: '10000.00' };
    const stubs: QueryStub[] = [
      { matcher: /select \* from budget_line where id/i, rows: [budgetLine] },
      { matcher: /select\s+coalesce/i, rows: [{ comprometido: '2000', gastado_real: '1000' }] }, // saldo = 10000-2000-1000 = 7000
      { matcher: /insert into purchase_request/i, rows: [{ id: 'pr-1', amount: '500', routing: 'within_budget', status: 'pending' }] },
    ];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new PurchaseRequestService(db as never, auditLog as never);

    const resultado = await service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, budgetLineId: BUDGET_LINE_ID, amount: 500 });

    expect(resultado.routing).toBe('within_budget');
  });

  it('clasifica como excepción cuando el monto excede el saldo disponible (resta commitments abiertos, no solo actual_postings)', async () => {
    const budgetLine = { id: BUDGET_LINE_ID, status: 'active', amount_budgeted: '10000.00' };
    // saldo = 10000 - 9000 (comprometido) - 500 (gastado) = 500 — una solicitud de 800 excede eso,
    // aunque 10000 - 500 (solo actual_posting) sí alcanzaría — por eso importa restar commitments.
    const stubs: QueryStub[] = [
      { matcher: /select \* from budget_line where id/i, rows: [budgetLine] },
      { matcher: /select\s+coalesce/i, rows: [{ comprometido: '9000', gastado_real: '500' }] },
      { matcher: /insert into purchase_request/i, rows: [{ id: 'pr-1', amount: '800', routing: 'exception', status: 'pending' }] },
    ];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new PurchaseRequestService(db as never, auditLog as never);

    const resultado = await service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, budgetLineId: BUDGET_LINE_ID, amount: 800 });

    expect(resultado.routing).toBe('exception');
  });

  it('audita la creación de la solicitud', async () => {
    const budgetLine = { id: BUDGET_LINE_ID, status: 'active', amount_budgeted: '10000.00' };
    const stubs: QueryStub[] = [
      { matcher: /select \* from budget_line where id/i, rows: [budgetLine] },
      { matcher: /select\s+coalesce/i, rows: [{ comprometido: '0', gastado_real: '0' }] },
      { matcher: /insert into purchase_request/i, rows: [{ id: 'pr-1', amount: '500', routing: 'within_budget', status: 'pending' }] },
    ];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new PurchaseRequestService(db as never, auditLog as never);

    await service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, budgetLineId: BUDGET_LINE_ID, amount: 500 });

    expect(auditLog.record).toHaveBeenCalledOnce();
  });

  it('listar filtra por status (ej. pending para la bandeja de aprobación)', async () => {
    const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from purchase_request where status/i, rows: [{ id: 'pr-1', status: 'pending' }] }]));
    const service = new PurchaseRequestService(db as never, auditLog as never);

    await expect(service.listar(ORG_ID, { status: 'pending' })).resolves.toHaveLength(1);
  });
});
