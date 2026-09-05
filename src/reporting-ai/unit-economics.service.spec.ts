import { describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { UnitEconomicsService } from './unit-economics.service.js';
import { crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';

// UC-RPT-03 — un test por criterio de aceptación textual.
describe('UnitEconomicsService', () => {
  it('calcula el ingreso de un atleta, pero el margen queda incompleto — costo directo y de HR nunca son atribuibles con este modelo de datos', async () => {
    const stubs: QueryStub[] = [{ matcher: /from fact_payment where athlete_user_id/i, rows: [{ total: '1500' }] }];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new UnitEconomicsService(db as never);

    const resultado = await service.consultar({ organizationId: ORG_ID, unit: 'athlete', unitRef: 'atleta-1', desde: '2026-01-01', hasta: '2026-01-31' });

    expect(resultado.revenue.disponible).toBe(true);
    expect(resultado.revenue.value).toBe(1500);
    expect(resultado.costoDirecto.disponible).toBe(false);
    expect(resultado.margen.disponible).toBe(false);
  });

  it('calcula ingreso por deporte agregando los atletas de los equipos de ese deporte', async () => {
    const stubs: QueryStub[] = [{ matcher: /fp\.athlete_user_id in/i, rows: [{ total: '3000' }] }];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new UnitEconomicsService(db as never);

    const resultado = await service.consultar({ organizationId: ORG_ID, unit: 'sport', unitRef: 'Futbol', desde: '2026-01-01', hasta: '2026-01-31' });

    expect(resultado.revenue.value).toBe(3000);
  });

  it('unit=venue: ningún componente es atribuible (invoice no se liga a venue) — nunca fuerza un ingreso inventado', async () => {
    const db = crearDbFalsa(crearClientFalso([]));
    const service = new UnitEconomicsService(db as never);

    const resultado = await service.consultar({ organizationId: ORG_ID, unit: 'venue', unitRef: 'venue-1', desde: '2026-01-01', hasta: '2026-01-31' });

    expect(resultado.revenue.disponible).toBe(false);
    expect(resultado.margen.disponible).toBe(false);
  });

  it('rechaza una unidad de análisis no reconocida', async () => {
    const db = crearDbFalsa(crearClientFalso([]));
    const service = new UnitEconomicsService(db as never);

    await expect(
      service.consultar({ organizationId: ORG_ID, unit: 'inexistente' as never, unitRef: 'x', desde: '2026-01-01', hasta: '2026-01-31' }),
    ).rejects.toThrow(BadRequestException);
  });
});
