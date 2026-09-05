import { api } from '@/lib/api';
import { listarDirectorio } from '@/lib/identity';
import type { Team } from '@/lib/types/sports-hub';
import type { WeeklyFeedbackQuestionConfig } from '@/lib/types/weekly-coach-feedback';
import { CaptureForm } from './capture-form';

interface RosterMembershipMinima {
  user_id: string;
  role: string;
  status: string;
}

export default async function CapturePage({ searchParams }: { searchParams: Promise<{ teamId?: string }> }) {
  const { teamId } = await searchParams;
  const equipos = await api.get<Team[]>('/sports-hub/teams');
  const equiposActivos = equipos.filter((t) => t.status === 'active');

  if (!teamId) {
    return (
      <div className="flex flex-col gap-6">
        <h2 className="text-lg font-semibold text-neutral-900">Feedback semanal (UC-WCF-01)</h2>
        <form method="get" className="flex items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">Equipo</span>
            <select name="teamId" required defaultValue="" className="w-56 rounded border border-neutral-300 px-3 py-2">
              <option value="" disabled>
                — elegir —
              </option>
              {equiposActivos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white">
            Continuar
          </button>
        </form>
      </div>
    );
  }

  const team = equipos.find((t) => t.id === teamId);
  const [roster, directorio, configs] = await Promise.all([
    api.get<RosterMembershipMinima[]>(`/sports-hub/teams/${teamId}/roster`),
    listarDirectorio(),
    api.get<WeeklyFeedbackQuestionConfig[]>('/weekly-coach-feedback/question-configs'),
  ]);

  const idsJugadores = new Set(roster.filter((r) => r.role === 'player' && r.status === 'active').map((r) => r.user_id));
  const jugadores = directorio.filter((u) => idsJugadores.has(u.user_id));
  const config = team ? (configs.find((c) => c.sport === team.sport && c.status === 'active') ?? null) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Feedback semanal — {team?.name ?? '—'}</h2>
        <p className="text-sm text-neutral-500">Ningún campo bloquea el guardado del resto del lote — se guarda lo que sí venga lleno.</p>
      </div>
      <CaptureForm teamId={teamId} jugadores={jugadores} config={config} />
      {jugadores.length === 0 && <p className="text-sm text-neutral-500">Sin jugadores activos en este equipo.</p>}
    </div>
  );
}
