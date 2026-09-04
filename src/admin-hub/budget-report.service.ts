import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';

export interface BudgetVsActualRow {
  budget_line_id: string;
  financial_dimension_id: string;
  season: string;
  period: string;
  amount_budgeted: string;
  comprometido: string;
  gastado_real: string;
}

export interface ConsultarBudgetVsActualInput {
  organizationId: string;
  financialDimensionId?: string;
  season?: string;
  period?: string;
}

// UC-ADM-07 — Consultar Budget vs. Actual. Solo lectura. En Fase 2 (antes de que exista el
// warehouse, arquitectura §9.3) lee directo del modelo transaccional como versión mínima —
// `fact_budget_actual` es un refinamiento posterior, no de este dominio.
@Injectable()
export class BudgetReportService {
  constructor(private readonly db: DatabaseService) {}

  // Criterio de aceptación: "suma actual_postings para 'gastado real' y commitments con
  // status=open por separado para 'comprometido', nunca los mezcla en una sola cifra." Se usan
  // subconsultas correlacionadas (no joins) para que múltiples commitments/actual_postings del
  // mismo budget_line no se crucen y dupliquen la suma.
  async consultar(input: ConsultarBudgetVsActualInput): Promise<BudgetVsActualRow[]> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<BudgetVsActualRow>(
        `select
           bl.id as budget_line_id,
           bl.financial_dimension_id,
           bl.season,
           bl.period,
           bl.amount_budgeted,
           coalesce((select sum(amount) from commitment where budget_line_id = bl.id and status = 'open'), 0) as comprometido,
           coalesce((select sum(amount) from actual_posting where budget_line_id = bl.id), 0) as gastado_real
         from budget_line bl
         where ($1::uuid is null or bl.financial_dimension_id = $1)
           and ($2::text is null or bl.season = $2)
           and ($3::text is null or bl.period = $3)
         order by bl.season, bl.period`,
        [input.financialDimensionId ?? null, input.season ?? null, input.period ?? null],
      );
      return rows;
    });
  }
}
