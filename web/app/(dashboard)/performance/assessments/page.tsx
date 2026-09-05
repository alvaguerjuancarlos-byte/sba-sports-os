import { api } from '@/lib/api';
import { listarDirectorio } from '@/lib/identity';
import type { PerformanceAssessment } from '@/lib/types/performance';
import { NewAssessmentForm } from './new-assessment-form';

export default async function AssessmentsPage({ searchParams }: { searchParams: Promise<{ playerId?: string }> }) {
  const { playerId } = await searchParams;
  const directorio = await listarDirectorio();
  const jugadores = directorio.filter((u) => u.role === 'player' && u.status === 'active');

  const evaluaciones = playerId ? await api.get<PerformanceAssessment[]>(`/performance/assessments/${playerId}`) : [];

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-neutral-900">Evaluaciones de desempeño</h2>

      <form method="get" className="flex items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Jugador</span>
          <select name="playerId" defaultValue={playerId ?? ''} className="w-56 rounded border border-neutral-300 px-3 py-2">
            <option value="" disabled>
              — elegir —
            </option>
            {jugadores.map((j) => (
              <option key={j.user_id} value={j.user_id}>
                {j.full_name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded border border-neutral-300 px-3 py-2 text-sm font-medium">
          Consultar
        </button>
      </form>

      {playerId && (
        <>
          <NewAssessmentForm playerId={playerId} />
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Categoría</th>
                <th className="py-2 pr-4">Puntaje</th>
                <th className="py-2 pr-4">Notas</th>
              </tr>
            </thead>
            <tbody>
              {evaluaciones.map((e) => (
                <tr key={e.id} className="border-b border-neutral-100">
                  <td className="py-2 pr-4">{e.assessment_date}</td>
                  <td className="py-2 pr-4">{e.category}</td>
                  <td className="py-2 pr-4">{e.score}</td>
                  <td className="py-2 pr-4 text-neutral-500">{e.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {evaluaciones.length === 0 && <p className="text-sm text-neutral-500">Sin evaluaciones todavía.</p>}
        </>
      )}
    </div>
  );
}
