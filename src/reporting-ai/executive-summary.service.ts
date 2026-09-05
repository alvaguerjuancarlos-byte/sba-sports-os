import { Injectable } from '@nestjs/common';
import { ExecutiveDashboardService } from './executive-dashboard.service.js';
import type { FiltrosDashboard } from './executive-dashboard.service.js';
import { generarResumenEjecutivo } from './reporting-ai.types.js';
import type { ResumenBullet } from './reporting-ai.types.js';

// UC-RPT-05 — Consultar resumen ejecutivo generado por IA. Ver nota de alcance en
// reporting-ai.types.ts (generarResumenEjecutivo): función determinista, no una integración real
// de LLM — mismo tratamiento que la sugerencia de IA de Performance (UC-PRF-03, Fase 5).
@Injectable()
export class ExecutiveSummaryService {
  constructor(private readonly dashboardService: ExecutiveDashboardService) {}

  async consultar(organizationId: string, filtros: FiltrosDashboard): Promise<ResumenBullet[]> {
    const dashboard = await this.dashboardService.consultar(organizationId, filtros);
    return generarResumenEjecutivo(dashboard);
  }
}
