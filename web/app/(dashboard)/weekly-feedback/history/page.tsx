import { api, ApiError } from '@/lib/api';
import { exigirSesion } from '@/lib/session';
import type { WeeklyFeedback } from '@/lib/types/weekly-coach-feedback';

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ playerId?: string }> }) {
  const sesion = await exigirSesion();
  const { playerId: playerIdParam } = await searchParams;
  const playerId = playerIdParam || sesion.userId;

  let historico: WeeklyFeedback[] = [];
  let error: string | null = null;
  try {
    historico = await api.get<WeeklyFeedback[]>(`/weekly-coach-feedback/players/${playerId}/history`);
  } catch (e) {
    error = e instanceof ApiError ? e.message : 'No se pudo consultar el histórico.';
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Histórico de feedback semanal (UC-WCF-02)</h2>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">playerId (vacío para tu propio historial)</span>
          <input name="playerId" defaultValue={playerIdParam ?? ''} placeholder={sesion.userId} className="w-72 rounded border border-neutral-300 px-3 py-2" />
        </label>
        <button type="submit" className="rounded border border-neutral-300 px-3 py-2 text-sm font-medium">
          Consultar
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!error && (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="py-2 pr-4">Semana</th>
              <th className="py-2 pr-4">Mood</th>
              <th className="py-2 pr-4">Atención</th>
              <th className="py-2 pr-4">Actitud</th>
              <th className="py-2 pr-4">Disposición</th>
              <th className="py-2 pr-4">Compromiso</th>
              <th className="py-2 pr-4">Nota</th>
            </tr>
          </thead>
          <tbody>
            {historico.map((f) => (
              <tr key={f.id} className="border-b border-neutral-100">
                <td className="py-2 pr-4">{f.week_ending}</td>
                <td className="py-2 pr-4">{f.mood ?? '—'}</td>
                <td className="py-2 pr-4">{f.attention ?? '—'}</td>
                <td className="py-2 pr-4">{f.attitude ?? '—'}</td>
                <td className="py-2 pr-4">{f.disposition ?? '—'}</td>
                <td className="py-2 pr-4">{f.commitment ?? '—'}</td>
                <td className="py-2 pr-4 text-neutral-500">{f.note ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!error && historico.length === 0 && <p className="text-sm text-neutral-500">Sin registros todavía.</p>}
    </div>
  );
}
