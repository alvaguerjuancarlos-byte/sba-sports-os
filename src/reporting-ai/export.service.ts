import { Injectable } from '@nestjs/common';
import { generarCsv } from '../configuration-studio/csv.util.js';
import { FinancialReportService } from './financial-report.service.js';
import type { GenerarReporteFinancieroInput } from './financial-report.service.js';

// UC-RPT-04, condensado — Exportar reporte (Excel/CSV/PDF controlado).
//
// Solo se implementa CSV — reutiliza generarCsv() ya construido para UC-CFG-03 (Configuration
// Studio), mismo "mínimo viable" documentado ahí: Excel es un binario .xlsx que requeriría una
// librería nueva no decidida, y PDF requiere un motor de renderizado (ninguno está integrado en
// este repo) — mismo principio de "comprar antes de construir" que Stripe/CDN de video
// (arquitectura §8), aplicado aquí a generación de documentos.
//
// "Un PDF exportado nunca expone una sección que el solicitante no podía ver en pantalla" (§7.4
// aplicado a exportación) — se cumple por construcción: este servicio nunca recibe datos crudos,
// siempre el resultado YA filtrado por el servicio de reporte correspondiente (FinancialReportService
// aquí no aplica ningún filtro de dato restringido propio porque el reporte financiero es, en sí,
// un dato de scope admin/director — ver el controller, que exige ese rol antes de generar el reporte).
@Injectable()
export class ExportService {
  constructor(private readonly financialReportService: FinancialReportService) {}

  async exportarReporteFinancieroCsv(input: GenerarReporteFinancieroInput): Promise<string> {
    const reporte = await this.financialReportService.generar(input);
    const encabezados = ['budget_line_id', 'season', 'period', 'amount_budgeted', 'actual_amount', 'open_commitment_amount', 'proyeccion_al_cierre'];
    const filas = reporte.lineas.map((l) => ({
      budget_line_id: l.budget_line_id,
      season: l.season,
      period: l.period,
      amount_budgeted: l.amount_budgeted,
      actual_amount: l.actual_amount,
      open_commitment_amount: l.open_commitment_amount,
      proyeccion_al_cierre: l.forecast?.proyeccionAlCierre ?? '',
    }));
    return generarCsv(encabezados, filas);
  }
}
