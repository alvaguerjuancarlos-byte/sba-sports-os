import { describe, expect, it } from 'vitest';
import { FinancialReportService } from './financial-report.service.js';
import { crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';

// UC-RPT-02 — un test por criterio de aceptación textual.
describe('FinancialReportService', () => {
  it('2a: incluye un budget_line sin actual_posting todavía, con actual_amount en 0 — nunca lo omite', async () => {
    const stubs: QueryStub[] = [
      { matcher: /select \* from fact_budget_actual/i, rows: [{ budget_line_id: 'bl-1', season: '2026', period: 'Q1', amount_budgeted: '1000', actual_amount: '0', open_commitment_amount: '0' }] },
      { matcher: /select \* from fact_payment/i, rows: [] },
    ];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new FinancialReportService(db as never);

    const resultado = await service.generar({ organizationId: ORG_ID });

    expect(resultado.lineas).toHaveLength(1);
    expect(resultado.lineas[0].actual_amount).toBe('0');
  });

  it('nunca suma open_commitment_amount al total de actual (evita el doble conteo)', async () => {
    const stubs: QueryStub[] = [
      { matcher: /select \* from fact_budget_actual/i, rows: [{ budget_line_id: 'bl-1', season: '2026', period: 'Q1', amount_budgeted: '1000', actual_amount: '300', open_commitment_amount: '200' }] },
      { matcher: /select \* from fact_payment/i, rows: [] },
    ];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new FinancialReportService(db as never);

    const resultado = await service.generar({ organizationId: ORG_ID });

    expect(resultado.totales.actual).toBe(300);
    expect(resultado.totales.openCommitment).toBe(200);
  });

  it('calcula el forecast solo cuando se dan periodStartDate/periodEndDate explícitos', async () => {
    const stubs: QueryStub[] = [
      { matcher: /select \* from fact_budget_actual/i, rows: [{ budget_line_id: 'bl-1', season: '2026', period: 'Q1', amount_budgeted: '900', actual_amount: '300', open_commitment_amount: '0' }] },
      { matcher: /select \* from fact_payment/i, rows: [] },
    ];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new FinancialReportService(db as never);

    const sinFechas = await service.generar({ organizationId: ORG_ID });
    expect(sinFechas.lineas[0].forecast).toBeNull();

    const conFechas = await service.generar({
      organizationId: ORG_ID,
      periodStartDate: '2026-01-01',
      periodEndDate: '2026-01-31',
      asOfDate: '2026-01-11',
    });
    expect(conFechas.lineas[0].forecast).not.toBeNull();
    expect(conFechas.lineas[0].forecast?.proyeccionAlCierre).toBeGreaterThan(0);
  });

  it('reporta cobranza: cuenta y suma solo las facturas efectivamente vencidas', async () => {
    const stubs: QueryStub[] = [
      { matcher: /select \* from fact_budget_actual/i, rows: [] },
      {
        matcher: /select \* from fact_payment/i,
        rows: [
          { invoice_id: 'inv-1', status: 'pending', due_date: '2020-01-01', amount_due: '500', amount_collected: '0' },
          { invoice_id: 'inv-2', status: 'pending', due_date: '2099-01-01', amount_due: '300', amount_collected: '0' },
        ],
      },
    ];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new FinancialReportService(db as never);

    const resultado = await service.generar({ organizationId: ORG_ID, asOfDate: '2026-06-01' });

    expect(resultado.cobranza.facturasVencidas).toBe(1);
    expect(resultado.cobranza.montoVencido).toBe(500);
  });
});
