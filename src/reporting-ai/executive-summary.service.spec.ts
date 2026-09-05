import { describe, expect, it, vi } from 'vitest';
import { ExecutiveSummaryService } from './executive-summary.service.js';

const ORG_ID = 'org-1';

describe('ExecutiveSummaryService', () => {
  it('genera el resumen a partir del dashboard ejecutivo del mismo periodo/filtros', async () => {
    const dashboardService = {
      consultar: vi.fn().mockResolvedValue({
        financiero: { tieneDatos: true, data: { totalBudgeted: 1000, totalActual: 500 } },
        comercial: { tieneDatos: false, data: { totalProspectos: 0, convertidos: 0 } },
        deportivo: { tieneDatos: false, data: { totalMinutosJugados: 0, totalGoles: 0, totalCheckins: 0 } },
        hr: { tieneDatos: false, data: { totalCheckinsPersonal: 0 } },
      }),
    };
    const service = new ExecutiveSummaryService(dashboardService as never);

    const bullets = await service.consultar(ORG_ID, { teamId: 'team-1' });

    expect(dashboardService.consultar).toHaveBeenCalledWith(ORG_ID, { teamId: 'team-1' });
    expect(bullets).toHaveLength(1);
    expect(bullets[0].fuente).toBeTruthy();
  });
});
