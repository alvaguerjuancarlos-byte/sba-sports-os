import { describe, expect, it } from 'vitest';
import { ExecutiveDashboardService } from './executive-dashboard.service.js';
import { crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';

function stubsBase(overrides: Partial<Record<'financiero' | 'comercial' | 'deportivo' | 'checkins' | 'hr', Record<string, unknown>>> = {}): QueryStub[] {
  return [
    { matcher: /from fact_budget_actual/i, rows: [overrides.financiero ?? { total_budgeted: '0', total_actual: '0', filas: '0' }] },
    { matcher: /from prospect/i, rows: [overrides.comercial ?? { total: '0', convertidos: '0' }] },
    { matcher: /from fact_match_performance/i, rows: [overrides.deportivo ?? { total_minutos: '0', total_goles: '0', filas: '0' }] },
    { matcher: /from fact_attendance/i, rows: [overrides.checkins ?? { total: '0' }] },
    { matcher: /from fact_hr_attendance/i, rows: [overrides.hr ?? { total: '0' }] },
  ];
}

// UC-RPT-01 — un test por criterio de aceptación textual.
describe('ExecutiveDashboardService', () => {
  it('todas las secciones se resuelven contra vistas fact_* — nunca contra las tablas transaccionales', async () => {
    const db = crearDbFalsa(crearClientFalso(stubsBase()));
    const service = new ExecutiveDashboardService(db as never);

    const resultado = await service.consultar(ORG_ID, {});

    expect(resultado.financiero.tieneDatos).toBe(false);
  });

  it('3a: una combinación de filtros sin datos regresa tieneDatos:false explícito, no un cero mezclado', async () => {
    const db = crearDbFalsa(crearClientFalso(stubsBase()));
    const service = new ExecutiveDashboardService(db as never);

    const resultado = await service.consultar(ORG_ID, { sport: 'Basquetbol' });

    expect(resultado.deportivo.tieneDatos).toBe(false);
    expect(resultado.deportivo.data.totalGoles).toBe(0);
  });

  it('distingue un 0 real (hubo partidos, cero goles) de "sin datos"', async () => {
    const db = crearDbFalsa(crearClientFalso(stubsBase({ deportivo: { total_minutos: '90', total_goles: '0', filas: '1' } })));
    const service = new ExecutiveDashboardService(db as never);

    const resultado = await service.consultar(ORG_ID, {});

    expect(resultado.deportivo.tieneDatos).toBe(true);
    expect(resultado.deportivo.data.totalGoles).toBe(0);
  });

  it('agrega correctamente cuando sí hay datos financieros', async () => {
    const db = crearDbFalsa(crearClientFalso(stubsBase({ financiero: { total_budgeted: '10000', total_actual: '4000', filas: '3' } })));
    const service = new ExecutiveDashboardService(db as never);

    const resultado = await service.consultar(ORG_ID, {});

    expect(resultado.financiero.tieneDatos).toBe(true);
    expect(resultado.financiero.data).toEqual({ totalBudgeted: 10000, totalActual: 4000 });
  });
});
