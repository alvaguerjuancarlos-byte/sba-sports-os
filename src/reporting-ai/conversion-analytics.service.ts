import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';

export interface ConversionAnalyticsResultado {
  porStageActual: { stage: string; total: number }[];
  tiempoPromedioEnEtapaDias: { stage: string; promedioDias: number }[];
  tasaTrialAWon: number | null;
  retencionPorSource: { source: string; total: number; won: number }[];
}

// UC-CRM-04, condensado — Consultar analítica de conversión del funnel. Diferida cuando se
// construyó CRM & Enrollment (Fase 6) hasta que existiera fact_enrollment_funnel (esta fase, ver
// migración 0017) — el propio UC exige leer de ahí, "no por consulta directa a prospect en
// producción (arquitectura §6.1, separación OLTP/OLAP)". Ninguna query de este servicio toca la
// tabla `prospect` directo — todas van contra la vista `fact_enrollment_funnel`.
@Injectable()
export class ConversionAnalyticsService {
  constructor(private readonly db: DatabaseService) {}

  async consultar(organizationId: string): Promise<ConversionAnalyticsResultado> {
    return this.db.withTenant(organizationId, async (client) => {
      // Etapa actual = el evento de stage más reciente por prospect (nunca se lee `stage`
      // directo de `prospect`).
      const { rows: porStageActual } = await client.query<{ stage: string; total: string }>(
        `select stage, count(*) as total from (
           select distinct on (prospect_id) prospect_id, stage
           from fact_enrollment_funnel
           order by prospect_id, occurred_at desc
         ) actual
         group by stage`,
      );

      const { rows: tiempoPromedio } = await client.query<{ stage: string; promedio_dias: string }>(
        `select stage, avg(extract(epoch from (siguiente_fecha - occurred_at)) / 86400) as promedio_dias
         from (
           select stage, occurred_at,
                  lead(occurred_at) over (partition by prospect_id order by occurred_at) as siguiente_fecha
           from fact_enrollment_funnel
         ) transiciones
         where siguiente_fecha is not null
         group by stage`,
      );

      const { rows: trialWonRows } = await client.query<{ paso_por_trial: string; llego_a_won: string }>(
        `select
           count(distinct prospect_id) filter (where stage = 'trial') as paso_por_trial,
           count(distinct prospect_id) filter (where stage = 'won' and prospect_id in (select prospect_id from fact_enrollment_funnel where stage = 'trial')) as llego_a_won
         from fact_enrollment_funnel`,
      );
      const pasoPorTrial = Number(trialWonRows[0]?.paso_por_trial ?? 0);
      const llegoAWon = Number(trialWonRows[0]?.llego_a_won ?? 0);
      const tasaTrialAWon = pasoPorTrial > 0 ? llegoAWon / pasoPorTrial : null;

      const { rows: retencion } = await client.query<{ source: string; total: string; won: string }>(
        `select source,
           count(distinct prospect_id) as total,
           count(distinct prospect_id) filter (where stage = 'won') as won
         from fact_enrollment_funnel
         group by source`,
      );

      return {
        porStageActual: porStageActual.map((r) => ({ stage: r.stage, total: Number(r.total) })),
        tiempoPromedioEnEtapaDias: tiempoPromedio.map((r) => ({ stage: r.stage, promedioDias: Number(r.promedio_dias) })),
        tasaTrialAWon,
        retencionPorSource: retencion.map((r) => ({ source: r.source, total: Number(r.total), won: Number(r.won) })),
      };
    });
  }
}
