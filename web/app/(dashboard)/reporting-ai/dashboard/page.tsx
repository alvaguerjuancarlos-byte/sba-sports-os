import { api } from '@/lib/api';
import type { DashboardEjecutivo, ResumenBullet } from '@/lib/types/reporting-ai';

interface Filtros {
  dateFrom?: string;
  dateTo?: string;
  teamId?: string;
  sport?: string;
}

function aQueryString(filtros: Filtros): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filtros)) {
    if (v) params.set(k, v);
  }
  return params.toString();
}

export default async function ExecutiveDashboardPage({ searchParams }: { searchParams: Promise<Filtros> }) {
  const filtros = await searchParams;
  const qs = aQueryString(filtros);

  const [dashboard, resumen] = await Promise.all([
    api.get<DashboardEjecutivo>(`/reporting-ai/dashboard${qs ? `?${qs}` : ''}`),
    api.get<ResumenBullet[]>(`/reporting-ai/dashboard/executive-summary${qs ? `?${qs}` : ''}`),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-neutral-900">Dashboard ejecutivo (UC-RPT-01/05)</h2>

      <form method="get" className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Desde</span>
          <input name="dateFrom" type="date" defaultValue={filtros.dateFrom} className="rounded border border-neutral-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Hasta</span>
          <input name="dateTo" type="date" defaultValue={filtros.dateTo} className="rounded border border-neutral-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Deporte</span>
          <input name="sport" defaultValue={filtros.sport} className="w-32 rounded border border-neutral-300 px-3 py-2" />
        </label>
        <button type="submit" className="rounded border border-neutral-300 px-3 py-2 text-sm font-medium">
          Filtrar
        </button>
      </form>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded border border-neutral-200 p-4">
          <h3 className="mb-2 text-sm font-semibold text-neutral-700">Financiero</h3>
          {dashboard.financiero.tieneDatos ? (
            <p className="text-sm text-neutral-700">
              Presupuestado: ${dashboard.financiero.data.totalBudgeted.toFixed(2)} · Real: ${dashboard.financiero.data.totalActual.toFixed(2)}
            </p>
          ) : (
            <p className="text-sm text-neutral-400 italic">Sin datos para este filtro</p>
          )}
        </div>

        <div className="rounded border border-neutral-200 p-4">
          <h3 className="mb-2 text-sm font-semibold text-neutral-700">Comercial</h3>
          {dashboard.comercial.tieneDatos ? (
            <p className="text-sm text-neutral-700">
              {dashboard.comercial.data.convertidos} convertido(s) de {dashboard.comercial.data.totalProspectos} prospecto(s)
            </p>
          ) : (
            <p className="text-sm text-neutral-400 italic">Sin datos para este filtro</p>
          )}
        </div>

        <div className="rounded border border-neutral-200 p-4">
          <h3 className="mb-2 text-sm font-semibold text-neutral-700">Deportivo</h3>
          {dashboard.deportivo.tieneDatos ? (
            <p className="text-sm text-neutral-700">
              {dashboard.deportivo.data.totalMinutosJugados} min jugados · {dashboard.deportivo.data.totalGoles} goles · {dashboard.deportivo.data.totalCheckins} check-ins
            </p>
          ) : (
            <p className="text-sm text-neutral-400 italic">Sin datos para este filtro</p>
          )}
        </div>

        <div className="rounded border border-neutral-200 p-4">
          <h3 className="mb-2 text-sm font-semibold text-neutral-700">HR</h3>
          {dashboard.hr.tieneDatos ? (
            <p className="text-sm text-neutral-700">{dashboard.hr.data.totalCheckinsPersonal} check-in(s) de personal</p>
          ) : (
            <p className="text-sm text-neutral-400 italic">Sin datos para este filtro</p>
          )}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Resumen ejecutivo (UC-RPT-05)</h3>
        <ul className="flex flex-col gap-2">
          {resumen.map((b, i) => (
            <li key={i} className="rounded border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
              {b.texto} <span className="text-xs text-neutral-400">— {b.fuente}</span>
            </li>
          ))}
        </ul>
        {resumen.length === 0 && <p className="text-sm text-neutral-500">Sin datos suficientes para un resumen.</p>}
      </div>
    </div>
  );
}
