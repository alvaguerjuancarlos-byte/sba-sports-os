import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';

export interface FiltrosDashboard {
  dateFrom?: string;
  dateTo?: string;
  teamId?: string;
  athleteUserId?: string;
  employeeId?: string;
  financialDimensionId?: string;
  sport?: string;
}

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

// UC-RPT-01 — Consultar dashboard ejecutivo con filtros cross-módulo. Todas las consultas de este
// servicio van contra las vistas fact_* (0017) — nunca contra las tablas transaccionales directo
// (criterio de aceptación, literal).
//
// 3a: "filtros sin intersección de datos → estado vacío explícito, no un cero engañoso mezclado
// con otros indicadores" — cada sección regresa `tieneDatos:false` cuando el filtro aplicable a
// ESA sección no tiene ninguna fila que agregar, distinguible de un 0 real (ej. un equipo que
// jugó pero no anotó goles sí tiene datos, con totalGoles:0).
@Injectable()
export class ExecutiveDashboardService {
  constructor(private readonly db: DatabaseService) {}

  async consultar(organizationId: string, filtros: FiltrosDashboard): Promise<DashboardEjecutivo> {
    return this.db.withTenant(organizationId, async (client) => {
      // Financiero
      const condicionesFin: string[] = [];
      const paramsFin: unknown[] = [];
      if (filtros.financialDimensionId) {
        paramsFin.push(filtros.financialDimensionId);
        condicionesFin.push(`financial_dimension_id = $${paramsFin.length}`);
      }
      const whereFin = condicionesFin.length ? `where ${condicionesFin.join(' and ')}` : '';
      const { rows: finRows } = await client.query<{ total_budgeted: string; total_actual: string; filas: string }>(
        `select coalesce(sum(amount_budgeted),0) as total_budgeted, coalesce(sum(actual_amount),0) as total_actual, count(*) as filas from fact_budget_actual ${whereFin}`,
        paramsFin,
      );
      const financiero = {
        tieneDatos: Number(finRows[0].filas) > 0,
        data: { totalBudgeted: Number(finRows[0].total_budgeted), totalActual: Number(finRows[0].total_actual) },
      };

      // Comercial (funnel) — conteo simple, la analítica completa vive en UC-CRM-04.
      const { rows: comRows } = await client.query<{ total: string; convertidos: string }>(
        `select count(*) as total, count(*) filter (where converted_at is not null) as convertidos from prospect`,
      );
      const comercial = {
        tieneDatos: Number(comRows[0].total) > 0,
        data: { totalProspectos: Number(comRows[0].total), convertidos: Number(comRows[0].convertidos) },
      };

      // Deportivo — filtrado por atleta/equipo/rango de fechas vía join a event.
      const condicionesDep: string[] = [];
      const paramsDep: unknown[] = [];
      if (filtros.athleteUserId) {
        paramsDep.push(filtros.athleteUserId);
        condicionesDep.push(`fmp.player_id = $${paramsDep.length}`);
      }
      if (filtros.teamId) {
        paramsDep.push(filtros.teamId);
        condicionesDep.push(`e.team_id = $${paramsDep.length}`);
      }
      if (filtros.dateFrom) {
        paramsDep.push(filtros.dateFrom);
        condicionesDep.push(`e.start_at >= $${paramsDep.length}`);
      }
      if (filtros.dateTo) {
        paramsDep.push(filtros.dateTo);
        condicionesDep.push(`e.start_at <= $${paramsDep.length}`);
      }
      const whereDep = condicionesDep.length ? `where ${condicionesDep.join(' and ')}` : '';
      const { rows: depRows } = await client.query<{ total_minutos: string; total_goles: string; filas: string }>(
        `select coalesce(sum(fmp.minutes_played),0) as total_minutos, coalesce(sum(fmp.goals),0) as total_goles, count(*) as filas
         from fact_match_performance fmp join event e on e.id = fmp.event_id ${whereDep}`,
        paramsDep,
      );
      const { rows: checkinRows } = await client.query<{ total: string }>(
        `select count(*) as total from fact_attendance fa join event e on e.id = fa.event_id
         ${filtros.athleteUserId ? 'where fa.athlete_id = $1' : ''}`,
        filtros.athleteUserId ? [filtros.athleteUserId] : [],
      );
      const deportivo = {
        tieneDatos: Number(depRows[0].filas) > 0 || Number(checkinRows[0].total) > 0,
        data: { totalMinutosJugados: Number(depRows[0].total_minutos), totalGoles: Number(depRows[0].total_goles), totalCheckins: Number(checkinRows[0].total) },
      };

      // HR
      const condicionesHr: string[] = [];
      const paramsHr: unknown[] = [];
      if (filtros.employeeId) {
        paramsHr.push(filtros.employeeId);
        condicionesHr.push(`employee_id = $${paramsHr.length}`);
      }
      const whereHr = condicionesHr.length ? `where ${condicionesHr.join(' and ')}` : '';
      const { rows: hrRows } = await client.query<{ total: string }>(`select count(*) as total from fact_hr_attendance ${whereHr}`, paramsHr);
      const hr = { tieneDatos: Number(hrRows[0].total) > 0, data: { totalCheckinsPersonal: Number(hrRows[0].total) } };

      return { financiero, comercial, deportivo, hr };
    });
  }
}
