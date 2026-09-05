// Espejo de src/reporting-ai/reporting-ai.types.ts (backend).
export interface SeccionDashboard<T> {
  tieneDatos: boolean;
  data: T;
}

export interface DashboardEjecutivo {
  financiero: SeccionDashboard<{ totalBudgeted: number; totalActual: number }>;
  comercial: SeccionDashboard<{ totalProspectos: number; convertidos: number }>;
  deportivo: SeccionDashboard<{ totalMinutosJugados: number; totalGoles: number; totalCheckins: number }>;
  hr: SeccionDashboard<{ totalCheckinsPersonal: number }>;
}

export interface ResumenBullet {
  texto: string;
  fuente: string;
}

export interface LineaBudgetVsActual {
  budget_line_id: string;
  financial_dimension_id: string;
  season: string;
  period: string;
  amount_budgeted: string;
  comprometido: string;
  gastado_real: string;
  forecast: { proyectadoFinal: number; diasTranscurridos: number; diasTotales: number } | null;
}

export interface ReporteFinanciero {
  lineas: LineaBudgetVsActual[];
  totales: { budgeted: number; actual: number; openCommitment: number };
  cobranza: { facturasVencidas: number; montoVencido: number };
}

export type UnidadDeAnalisis = 'athlete' | 'sport' | 'venue' | 'coach_hour';

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

export interface ConversionAnalyticsResultado {
  porStageActual: { stage: string; total: number }[];
  tiempoPromedioEnEtapaDias: { stage: string; promedioDias: number }[];
  tasaTrialAWon: number | null;
  retencionPorSource: { source: string; total: number; won: number }[];
}

export type RespuestaAgente =
  | { tipo: 'respuesta'; texto: string; fuente: string }
  | { tipo: 'propuesta_de_accion'; texto: string; accion: 'declinar_convocatoria'; parametros: { callupSlotId: string } }
  | { tipo: 'fuera_de_scope'; texto: string };
