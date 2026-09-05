import { describe, expect, it, vi } from 'vitest';
import { ConversionAnalyticsService } from './conversion-analytics.service.js';
import { crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';

// UC-CRM-04 — un test por métrica que el criterio de aceptación pide.
describe('ConversionAnalyticsService', () => {
  it('consulta contra fact_enrollment_funnel, nunca contra prospect directo', async () => {
    const stubs: QueryStub[] = [
      { matcher: /from \(\s*select distinct on \(prospect_id\)/is, rows: [{ stage: 'lead', total: '3' }] },
      { matcher: /lead\(occurred_at\)/i, rows: [{ stage: 'lead', promedio_dias: '2.5' }] },
      { matcher: /paso_por_trial/i, rows: [{ paso_por_trial: '4', llego_a_won: '2' }] },
      { matcher: /group by source/i, rows: [{ source: 'referido', total: '5', won: '2' }] },
    ];
    const client = crearClientFalso(stubs);
    const db = crearDbFalsa(client);
    const service = new ConversionAnalyticsService(db as never);

    const resultado = await service.consultar(ORG_ID);

    expect(resultado.porStageActual).toEqual([{ stage: 'lead', total: 3 }]);
    expect(resultado.tasaTrialAWon).toBe(0.5);
    expect(resultado.retencionPorSource).toEqual([{ source: 'referido', total: 5, won: 2 }]);
    const llamadaAProspectDirecto = (client.query as ReturnType<typeof vi.fn>).mock.calls.find(([sql]: [string]) => /select \* from prospect\b/i.test(sql));
    expect(llamadaAProspectDirecto).toBeUndefined();
  });

  it('regresa tasaTrialAWon null si ningún prospect pasó por trial (evita división por cero)', async () => {
    const stubs: QueryStub[] = [
      { matcher: /from \(\s*select distinct on \(prospect_id\)/is, rows: [] },
      { matcher: /lead\(occurred_at\)/i, rows: [] },
      { matcher: /paso_por_trial/i, rows: [{ paso_por_trial: '0', llego_a_won: '0' }] },
      { matcher: /group by source/i, rows: [] },
    ];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new ConversionAnalyticsService(db as never);

    const resultado = await service.consultar(ORG_ID);

    expect(resultado.tasaTrialAWon).toBeNull();
  });
});
