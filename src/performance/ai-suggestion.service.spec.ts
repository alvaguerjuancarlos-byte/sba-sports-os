import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { AiSuggestionService } from './ai-suggestion.service.js';
import { crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';
import type { DevelopmentMapRow } from './performance.types.js';

const ORG_ID = 'org-1';
const ATHLETE_ID = 'p1';
const DESDE = '2026-01-01';
const HASTA = '2026-03-01';

function mapaFalso(overrides: Partial<DevelopmentMapRow> = {}): DevelopmentMapRow {
  return {
    id: 'dm-1',
    organization_id: ORG_ID,
    scope: 'athlete',
    scope_ref_id: ATHLETE_ID,
    date_range_start: DESDE,
    date_range_end: HASTA,
    dimensions: {
      desempeño: { value: 80, sufficientData: true },
      rendimientoEnPartido: { value: 1, sufficientData: true },
      actitudSemanal: { value: 4, sufficientData: true },
      asistencia: { value: 5, sufficientData: true },
    },
    ai_suggestion: null,
    generated_at: '2026-03-01T00:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function developmentMapServiceFalso(mapa: DevelopmentMapRow | (() => never)) {
  return { obtener: vi.fn(typeof mapa === 'function' ? mapa : () => Promise.resolve(mapa)) };
}
function matchQueryServiceFalso(partidos: unknown[]) {
  return { consultarEstadisticasDeJugadorEnRango: vi.fn().mockResolvedValue(partidos) };
}

// UC-PRF-03 — un test por criterio de aceptación textual.
describe('AiSuggestionService', () => {
  it('propaga NotFoundException si no existe development_map calculado (precondición)', async () => {
    const db = crearDbFalsa(crearClientFalso([]));
    const developmentMapService = developmentMapServiceFalso(() => {
      throw new NotFoundException('no existe');
    });
    const service = new AiSuggestionService(db as never, developmentMapService as never, matchQueryServiceFalso([]) as never);

    await expect(service.consultar({ organizationId: ORG_ID, athleteUserId: ATHLETE_ID, dateRangeStart: DESDE, dateRangeEnd: HASTA })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('2a: sin volumen de datos suficiente (0 partidos jugados) no genera ai_suggestion — regresa insufficientData:true', async () => {
    const db = crearDbFalsa(crearClientFalso([]));
    const developmentMapService = developmentMapServiceFalso(mapaFalso());
    const service = new AiSuggestionService(db as never, developmentMapService as never, matchQueryServiceFalso([]) as never);

    const resultado = await service.consultar({ organizationId: ORG_ID, athleteUserId: ATHLETE_ID, dateRangeStart: DESDE, dateRangeEnd: HASTA });

    expect(resultado.insufficientData).toBe(true);
    expect(resultado.suggestion).toBeNull();
  });

  it('con volumen suficiente genera la sugerencia con sus variables y la persiste en development_map', async () => {
    const stubs: QueryStub[] = [{ matcher: /update development_map set ai_suggestion/i, rows: [] }];
    const client = crearClientFalso(stubs);
    const db = crearDbFalsa(client);
    const developmentMapService = developmentMapServiceFalso(mapaFalso());
    const service = new AiSuggestionService(db as never, developmentMapService as never, matchQueryServiceFalso([{ id: 'ps-1' }]) as never);

    const resultado = await service.consultar({ organizationId: ORG_ID, athleteUserId: ATHLETE_ID, dateRangeStart: DESDE, dateRangeEnd: HASTA });

    expect(resultado.insufficientData).toBe(false);
    expect(resultado.suggestion?.recommendation).toBeTruthy();
    expect(Object.keys(resultado.suggestion?.variables ?? {}).length).toBeGreaterThan(0);
    expect(client.query).toHaveBeenCalled();
  });
});
