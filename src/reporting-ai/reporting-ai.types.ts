// Tipos de fila — reflejan las vistas de db/migrations/0017_reporting_ai_init.sql.

export interface FactEnrollmentFunnelRow {
  organization_id: string;
  prospect_id: string;
  source: string;
  stage: string;
  occurred_at: string;
}

export interface FactBudgetActualRow {
  organization_id: string;
  budget_line_id: string;
  financial_dimension_id: string;
  season: string;
  period: string;
  amount_budgeted: string;
  actual_amount: string;
  open_commitment_amount: string;
}

export interface FactPaymentRow {
  organization_id: string;
  invoice_id: string;
  athlete_user_id: string;
  financial_dimension_id: string | null;
  amount_due: string;
  due_date: string;
  status: 'pending' | 'paid';
  amount_collected: string;
}

export interface FactMatchPerformanceRow {
  organization_id: string;
  player_id: string;
  event_id: string;
  minutes_played: number;
  goals: number;
  cards: number;
}

export interface FactAttendanceRow {
  organization_id: string;
  athlete_id: string;
  event_id: string;
  method: string;
  checked_in_at: string;
}

export interface FactCallupRow {
  organization_id: string;
  player_id: string;
  event_id: string;
  status: string;
  priority_score: string | null;
  responded_at: string | null;
}

export interface FactHrAttendanceRow {
  organization_id: string;
  employee_id: string;
  checked_in_at: string;
}

// UC-RPT-02, criterio de aceptación: "el P&L y el Budget vs Actual nunca cuentan dos veces el
// mismo monto por mezclar commitment abiertos con actual_posting ya reconocidos" — el forecast se
// calcula SOLO sobre actual_amount (gasto reconocido), nunca sumando open_commitment_amount.
export interface ForecastInput {
  amountBudgeted: number;
  actualAmount: number;
  diasTranscurridosDelPeriodo: number;
  diasTotalesDelPeriodo: number;
}

export interface ForecastResultado {
  ritmoDiario: number;
  proyeccionAlCierre: number;
  excedePresupuesto: boolean;
}

// [propuesto] — el RFP pide "forecast" sin especificar el modelo; se usa proyección lineal simple
// (ritmo de gasto observado × días restantes) — el modelo más simple que es honesto sobre no tener
// suficiente información para algo más sofisticado (estacionalidad, tendencias), documentado aquí
// para que sea auditable y reemplazable.
export function calcularForecast(input: ForecastInput): ForecastResultado {
  if (input.diasTranscurridosDelPeriodo <= 0) {
    return { ritmoDiario: 0, proyeccionAlCierre: input.actualAmount, excedePresupuesto: input.actualAmount > input.amountBudgeted };
  }
  const ritmoDiario = input.actualAmount / input.diasTranscurridosDelPeriodo;
  const proyeccionAlCierre = ritmoDiario * input.diasTotalesDelPeriodo;
  return { ritmoDiario, proyeccionAlCierre, excedePresupuesto: proyeccionAlCierre > input.amountBudgeted };
}

// UC-RPT-03, criterio de aceptación: "todo margen calculado es trazable a las tres fuentes...
// ningún margen se presenta como completo si falta una de sus tres fuentes sin señalarlo."
export interface ComponenteUnitEconomics {
  value: number | null;
  disponible: boolean;
  razonNoDisponible?: string;
}

export interface UnitEconomicsResultado {
  revenue: ComponenteUnitEconomics;
  costoDirecto: ComponenteUnitEconomics;
  costoHr: ComponenteUnitEconomics;
  margen: ComponenteUnitEconomics;
}

export function calcularUnitEconomics(revenue: ComponenteUnitEconomics, costoDirecto: ComponenteUnitEconomics, costoHr: ComponenteUnitEconomics): UnitEconomicsResultado {
  const completo = revenue.disponible && costoDirecto.disponible && costoHr.disponible;
  if (!completo) {
    return { revenue, costoDirecto, costoHr, margen: { value: null, disponible: false, razonNoDisponible: 'Falta al menos uno de los tres componentes (ingreso/costo directo/costo de HR).' } };
  }
  const margen = (revenue.value as number) - (costoDirecto.value as number) - (costoHr.value as number);
  return { revenue, costoDirecto, costoHr, margen: { value: margen, disponible: true } };
}

// UC-RPT-05, criterio de aceptación: "toda frase del resumen ejecutivo es trazable a al menos una
// métrica/reporte de origen citado explícitamente... ninguna afirmación sin fuente trazable se
// incluye, aunque el modelo la considere plausible." [propuesto]: función determinista — cada
// bullet nace de un campo específico de un reporte ya calculado, nunca de texto libre generado;
// una sección sin datos (tieneDatos:false) simplemente no produce bullet, nunca una afirmación sin
// respaldo.
export interface ResumenBullet {
  texto: string;
  fuente: string;
}

export interface DashboardParaResumen {
  financiero: { tieneDatos: boolean; data: { totalBudgeted: number; totalActual: number } };
  comercial: { tieneDatos: boolean; data: { totalProspectos: number; convertidos: number } };
  deportivo: { tieneDatos: boolean; data: { totalMinutosJugados: number; totalGoles: number; totalCheckins: number } };
  hr: { tieneDatos: boolean; data: { totalCheckinsPersonal: number } };
}

export function generarResumenEjecutivo(dashboard: DashboardParaResumen): ResumenBullet[] {
  const bullets: ResumenBullet[] = [];

  if (dashboard.financiero.tieneDatos) {
    const { totalBudgeted, totalActual } = dashboard.financiero.data;
    const pct = totalBudgeted > 0 ? ((totalActual / totalBudgeted) * 100).toFixed(1) : '0.0';
    bullets.push({ texto: `Presupuesto ejecutado: $${totalActual.toFixed(2)} de $${totalBudgeted.toFixed(2)} presupuestado (${pct}%).`, fuente: 'fact_budget_actual' });
  }

  if (dashboard.comercial.tieneDatos) {
    const { totalProspectos, convertidos } = dashboard.comercial.data;
    const pct = totalProspectos > 0 ? ((convertidos / totalProspectos) * 100).toFixed(1) : '0.0';
    bullets.push({ texto: `${convertidos} de ${totalProspectos} prospectos convertidos a inscripción (${pct}%).`, fuente: 'prospect / fact_enrollment_funnel' });
  }

  if (dashboard.deportivo.tieneDatos) {
    const { totalMinutosJugados, totalGoles, totalCheckins } = dashboard.deportivo.data;
    bullets.push({ texto: `${totalGoles} goles y ${totalMinutosJugados} minutos jugados registrados; ${totalCheckins} check-ins de asistencia.`, fuente: 'fact_match_performance / fact_attendance' });
  }

  if (dashboard.hr.tieneDatos) {
    bullets.push({ texto: `${dashboard.hr.data.totalCheckinsPersonal} check-ins de personal registrados en el periodo.`, fuente: 'fact_hr_attendance' });
  }

  return bullets;
}
