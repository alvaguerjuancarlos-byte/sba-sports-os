import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvoiceService } from './invoice.service.js';
import { crearAuditLogFalso, crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'admin-1';
const ATHLETE_ID = 'atleta-1';

function membershipPlanFalso(plan: Record<string, unknown> | null) {
  return { obtenerPorId: vi.fn().mockResolvedValue(plan) };
}

function productCatalogFalso(producto: Record<string, unknown> | null) {
  return { obtenerPorId: vi.fn().mockResolvedValue(producto) };
}

// UC-PAY-02 — un test por criterio de aceptación textual.
describe('InvoiceService', () => {
  let auditLog: ReturnType<typeof crearAuditLogFalso>;

  beforeEach(() => {
    auditLog = crearAuditLogFalso();
  });

  it('toda invoice referencia un membership_plan o un producto de catálogo — rechaza si no viene ninguno', async () => {
    const db = crearDbFalsa(crearClientFalso([]));
    const service = new InvoiceService(db as never, auditLog as never, membershipPlanFalso(null) as never, productCatalogFalso(null) as never);

    await expect(
      service.generar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, athleteUserId: ATHLETE_ID, dueDate: '2026-07-01' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('cargo ad hoc: lanza NotFoundException si el producto de catálogo no existe', async () => {
    const db = crearDbFalsa(crearClientFalso([]));
    const service = new InvoiceService(db as never, auditLog as never, membershipPlanFalso(null) as never, productCatalogFalso(null) as never);

    await expect(
      service.generar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, athleteUserId: ATHLETE_ID, productCatalogId: 'no-existe', dueDate: '2026-07-01' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('cargo ad hoc: usa el precio del producto tal cual, sin aplicar beca', async () => {
    const producto = { id: 'prod-1', price: '500.00', financial_dimension_id: 'dim-1' };
    const stubs: QueryStub[] = [
      { matcher: /insert into invoice/i, rows: [{ id: 'inv-1', athlete_user_id: ATHLETE_ID, amount_due: '500.00', due_date: '2026-07-01', status: 'pending' }] },
    ];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new InvoiceService(db as never, auditLog as never, membershipPlanFalso(null) as never, productCatalogFalso(producto) as never);

    const resultado = await service.generar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, athleteUserId: ATHLETE_ID, productCatalogId: 'prod-1', dueDate: '2026-07-01' });

    expect(resultado.amount_due).toBe('500.00');
  });

  it('con membership_plan y beca activa, el monto de la factura refleja el descuento (1a)', async () => {
    const plan = { id: 'plan-1', product_catalog_id: 'prod-1', amount: '1000.00', scholarship_flag: true, scholarship_amount: '300', scholarship_pct: null };
    const producto = { id: 'prod-1', price: '1000.00', financial_dimension_id: 'dim-1' };
    const stubs: QueryStub[] = [
      { matcher: /insert into invoice/i, rows: [{ id: 'inv-1', athlete_user_id: ATHLETE_ID, amount_due: '700.00', due_date: '2026-07-01', status: 'pending' }] },
    ];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new InvoiceService(db as never, auditLog as never, membershipPlanFalso(plan) as never, productCatalogFalso(producto) as never);

    const resultado = await service.generar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, athleteUserId: ATHLETE_ID, membershipPlanId: 'plan-1', dueDate: '2026-07-01' });

    expect(resultado.amount_due).toBe('700.00');
    expect(auditLog.record).toHaveBeenCalledOnce();
  });

  it('copia el financial_dimension_id del producto — necesario para UC-PAY-05', async () => {
    const producto = { id: 'prod-1', price: '500.00', financial_dimension_id: 'dim-qualifying' };
    const stubs: QueryStub[] = [{ matcher: /insert into invoice/i, rows: [{ id: 'inv-1' }] }];
    const client = crearClientFalso(stubs);
    const db = crearDbFalsa(client);
    const service = new InvoiceService(db as never, auditLog as never, membershipPlanFalso(null) as never, productCatalogFalso(producto) as never);

    await service.generar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, athleteUserId: ATHLETE_ID, productCatalogId: 'prod-1', dueDate: '2026-07-01' });

    const [, params] = (client.query as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(params).toContain('dim-qualifying');
  });
});
