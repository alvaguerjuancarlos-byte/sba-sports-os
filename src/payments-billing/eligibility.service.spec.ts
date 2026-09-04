import { describe, expect, it, vi } from 'vitest';
import type { PoolClient } from 'pg';
import { EligibilityService } from './eligibility.service.js';
import { crearDbFalsa } from './test-helpers.js';

const ORG_ID = 'org-1';
const ATHLETE_ID = 'atleta-1';

function financialDimensionsFalso(dimension: Record<string, unknown> | null) {
  return { obtenerPorId: vi.fn().mockResolvedValue(dimension) };
}

// UC-PAY-05 — un test por criterio de aceptación textual.
describe('EligibilityService', () => {
  it('sin facturas pendientes, es elegible', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const client = { query } as unknown as PoolClient;
    const db = crearDbFalsa(client);
    const service = new EligibilityService(db as never, financialDimensionsFalso(null) as never);

    const resultado = await service.consultar({ organizationId: ORG_ID, athleteUserId: ATHLETE_ID });

    expect(resultado.eligible).toBe(true);
  });

  it('una factura vencida sin financial_dimension_id nunca bloquea (2a)', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: 'inv-1', status: 'pending', due_date: '2020-01-01', financial_dimension_id: null }] });
    const client = { query } as unknown as PoolClient;
    const db = crearDbFalsa(client);
    const financialDimensions = financialDimensionsFalso(null);
    const service = new EligibilityService(db as never, financialDimensions as never);

    const resultado = await service.consultar({ organizationId: ORG_ID, athleteUserId: ATHLETE_ID });

    expect(resultado.eligible).toBe(true);
    expect(financialDimensions.obtenerPorId).not.toHaveBeenCalled();
  });

  it('una factura vencida de un tipo no cualificante responde elegible (2a)', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: 'inv-1', status: 'pending', due_date: '2020-01-01', financial_dimension_id: 'dim-1' }] });
    const client = { query } as unknown as PoolClient;
    const db = crearDbFalsa(client);
    const financialDimensions = financialDimensionsFalso({ id: 'dim-1', is_qualifying_for_block: false });
    const service = new EligibilityService(db as never, financialDimensions as never);

    const resultado = await service.consultar({ organizationId: ORG_ID, athleteUserId: ATHLETE_ID });

    expect(resultado.eligible).toBe(true);
  });

  it('una factura vencida de un tipo cualificante bloquea, con banner/link generados junto con la respuesta', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: 'inv-1', status: 'pending', due_date: '2020-01-01', financial_dimension_id: 'dim-1' }] });
    const client = { query } as unknown as PoolClient;
    const db = crearDbFalsa(client);
    const financialDimensions = financialDimensionsFalso({ id: 'dim-1', is_qualifying_for_block: true });
    const service = new EligibilityService(db as never, financialDimensions as never);

    const resultado = await service.consultar({ organizationId: ORG_ID, athleteUserId: ATHLETE_ID });

    expect(resultado.eligible).toBe(false);
    expect(resultado.blockingInvoiceId).toBe('inv-1');
    expect(resultado.paymentLink).toBeTruthy();
  });

  it('una factura pending que aún no vence no cuenta como bloqueante', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: 'inv-1', status: 'pending', due_date: '2099-01-01', financial_dimension_id: 'dim-1' }] });
    const client = { query } as unknown as PoolClient;
    const db = crearDbFalsa(client);
    const financialDimensions = financialDimensionsFalso({ id: 'dim-1', is_qualifying_for_block: true });
    const service = new EligibilityService(db as never, financialDimensions as never);

    const resultado = await service.consultar({ organizationId: ORG_ID, athleteUserId: ATHLETE_ID });

    expect(resultado.eligible).toBe(true);
  });
});
