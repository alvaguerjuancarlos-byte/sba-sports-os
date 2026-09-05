import { api } from '@/lib/api';
import type { ReporteFinanciero } from '@/lib/types/reporting-ai';

export default async function FinancialReportPage({ searchParams }: { searchParams: Promise<{ season?: string; period?: string }> }) {
  const { season, period } = await searchParams;
  const params = new URLSearchParams();
  if (season) params.set('season', season);
  if (period) params.set('period', period);
  const qs = params.toString();

  const reporte = await api.get<ReporteFinanciero>(`/reporting-ai/financial-report${qs ? `?${qs}` : ''}`);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Reporte financiero — Budget vs Actual (UC-RPT-02)</h2>
        <p className="text-sm text-neutral-500">El &quot;P&amp;L&quot; de este modelo de datos es el Budget vs Actual agrupado por dimensión financiera.</p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Temporada</span>
          <input name="season" defaultValue={season} placeholder="2026-2027" className="w-40 rounded border border-neutral-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Periodo</span>
          <input name="period" defaultValue={period} placeholder="Q1" className="w-28 rounded border border-neutral-300 px-3 py-2" />
        </label>
        <button type="submit" className="rounded border border-neutral-300 px-3 py-2 text-sm font-medium">
          Filtrar
        </button>
        <a href={`/api/reporting-ai/financial-report-export${qs ? `?${qs}` : ''}`} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white">
          Exportar CSV (UC-RPT-04)
        </a>
      </form>

      <div className="flex gap-6 text-sm text-neutral-700">
        <p>Presupuestado: ${reporte.totales.budgeted.toFixed(2)}</p>
        <p>Real: ${reporte.totales.actual.toFixed(2)}</p>
        <p>Comprometido abierto: ${reporte.totales.openCommitment.toFixed(2)}</p>
        <p className="text-red-600">Facturas vencidas: {reporte.cobranza.facturasVencidas} (${reporte.cobranza.montoVencido.toFixed(2)})</p>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4">Temporada / periodo</th>
            <th className="py-2 pr-4">Presupuestado</th>
            <th className="py-2 pr-4">Comprometido</th>
            <th className="py-2 pr-4">Real</th>
            <th className="py-2 pr-4">Forecast</th>
          </tr>
        </thead>
        <tbody>
          {reporte.lineas.map((l) => (
            <tr key={l.budget_line_id} className="border-b border-neutral-100">
              <td className="py-2 pr-4">
                {l.season} / {l.period}
              </td>
              <td className="py-2 pr-4">${l.amount_budgeted}</td>
              <td className="py-2 pr-4">${l.comprometido}</td>
              <td className="py-2 pr-4">${l.gastado_real}</td>
              <td className="py-2 pr-4 text-neutral-500">{l.forecast ? `$${l.forecast.proyectadoFinal.toFixed(2)}` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {reporte.lineas.length === 0 && <p className="text-sm text-neutral-500">Sin líneas para este filtro.</p>}
    </div>
  );
}
