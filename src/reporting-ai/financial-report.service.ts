import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { calcularEstadoEfectivo } from '../payments-billing/payments-billing.types.js';
import { calcularForecast } from './reporting-ai.types.js';
import type { FactBudgetActualRow, FactPaymentRow } from './reporting-ai.types.js';

export interface GenerarReporteFinancieroInput {
  organizationId: string;
  season?: string;
  period?: string;
  // [propuesto]: `budget_line.period` es texto libre (decisión de Admin Hub, Fase 2) — sin un
  // rango de fechas propio no hay forma de calcular "días transcurridos del periodo" para el
  // forecast; se pide explícito al solicitante, igual que `finalMinute` en Match Center (Fase 4).
  periodStartDate?: string;
  periodEndDate?: string;
  asOfDate?: string;
}

export interface LineaBudgetVsActual extends FactBudgetActualRow {
  forecast: ReturnType<typeof calcularForecast> | null;
}

export interface ReporteFinanciero {
  lineas: LineaBudgetVsActual[];
  totales: { budgeted: number; actual: number; openCommitment: number };
  cobranza: { facturasVencidas: number; montoVencido: number };
}

// UC-RPT-02 — Generar reporte financiero (Budget vs Actual, P&L, forecast, cobranza). El "P&L"
// (RFP, literal) para este modelo de datos ES el Budget vs Actual agrupado por
// financial_dimension — no hay una tabla de ingresos/egresos separada de budget_line/actual_posting
// (arquitectura, Admin Hub) para construir un P&L distinto; agrupar estas mismas líneas por
// dimensión es el P&L.
@Injectable()
export class FinancialReportService {
  constructor(private readonly db: DatabaseService) {}

  async generar(input: GenerarReporteFinancieroInput): Promise<ReporteFinanciero> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const condiciones: string[] = [];
      const params: unknown[] = [];
      if (input.season) {
        params.push(input.season);
        condiciones.push(`season = $${params.length}`);
      }
      if (input.period) {
        params.push(input.period);
        condiciones.push(`period = $${params.length}`);
      }
      const whereClause = condiciones.length > 0 ? `where ${condiciones.join(' and ')}` : '';

      // 2a: "un budget_line no tiene actual_posting todavía → se muestra con 0 de actual... no
      // se omite" — ya garantizado por la vista fact_budget_actual (LEFT JOIN + coalesce).
      const { rows: lineasCrudas } = await client.query<FactBudgetActualRow>(`select * from fact_budget_actual ${whereClause} order by season, period`, params);

      let diasTranscurridos: number | null = null;
      let diasTotales: number | null = null;
      if (input.periodStartDate && input.periodEndDate) {
        const inicio = new Date(input.periodStartDate);
        const fin = new Date(input.periodEndDate);
        const hoy = input.asOfDate ? new Date(input.asOfDate) : new Date();
        diasTotales = Math.max(1, Math.round((fin.getTime() - inicio.getTime()) / 86400000));
        diasTranscurridos = Math.max(0, Math.round((hoy.getTime() - inicio.getTime()) / 86400000));
      }

      const lineas: LineaBudgetVsActual[] = lineasCrudas.map((linea) => ({
        ...linea,
        forecast:
          diasTranscurridos != null && diasTotales != null
            ? calcularForecast({
                amountBudgeted: Number(linea.amount_budgeted),
                actualAmount: Number(linea.actual_amount),
                diasTranscurridosDelPeriodo: diasTranscurridos,
                diasTotalesDelPeriodo: diasTotales,
              })
            : null,
      }));

      const totales = lineas.reduce(
        (acc, l) => ({
          budgeted: acc.budgeted + Number(l.amount_budgeted),
          actual: acc.actual + Number(l.actual_amount),
          openCommitment: acc.openCommitment + Number(l.open_commitment_amount),
        }),
        { budgeted: 0, actual: 0, openCommitment: 0 },
      );

      // Cobranza — mismo cálculo de "vencida" ya usado en UC-PAY-05/UC-CUP-01, aplicado aquí
      // como reporte agregado en vez de una decisión de elegibilidad puntual.
      const { rows: pagos } = await client.query<FactPaymentRow>(`select * from fact_payment where status = 'pending'`);
      const hoy = input.asOfDate ? new Date(input.asOfDate) : new Date();
      const vencidas = pagos.filter((p) => calcularEstadoEfectivo(p.status, p.due_date, hoy) === 'overdue');

      return {
        lineas,
        totales,
        cobranza: {
          facturasVencidas: vencidas.length,
          montoVencido: vencidas.reduce((suma, p) => suma + Number(p.amount_due) - Number(p.amount_collected), 0),
        },
      };
    });
  }
}
