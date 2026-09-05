import { api } from '@/lib/api';
import type { ConversionAnalyticsResultado } from '@/lib/types/reporting-ai';

export default async function ConversionAnalyticsPage() {
  const data = await api.get<ConversionAnalyticsResultado>('/reporting-ai/crm/conversion-analytics');

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-neutral-900">Analítica de conversión (UC-CRM-04)</h2>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Prospectos por etapa</h3>
        <ul className="flex flex-col gap-1 text-sm text-neutral-700">
          {data.porStageActual.map((s) => (
            <li key={s.stage}>
              {s.stage}: {s.total}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Tiempo promedio por etapa (días)</h3>
        <ul className="flex flex-col gap-1 text-sm text-neutral-700">
          {data.tiempoPromedioEnEtapaDias.map((s) => (
            <li key={s.stage}>
              {s.stage}: {s.promedioDias.toFixed(1)} días
            </li>
          ))}
        </ul>
      </div>

      <p className="text-sm text-neutral-700">Tasa de prueba a ganado: {data.tasaTrialAWon != null ? `${(data.tasaTrialAWon * 100).toFixed(1)}%` : 'sin datos suficientes'}</p>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Retención por origen</h3>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="py-2 pr-4">Origen</th>
              <th className="py-2 pr-4">Total</th>
              <th className="py-2 pr-4">Ganados</th>
            </tr>
          </thead>
          <tbody>
            {data.retencionPorSource.map((s) => (
              <tr key={s.source} className="border-b border-neutral-100">
                <td className="py-2 pr-4">{s.source}</td>
                <td className="py-2 pr-4">{s.total}</td>
                <td className="py-2 pr-4">{s.won}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
