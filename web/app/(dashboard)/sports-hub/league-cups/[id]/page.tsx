import { api } from '@/lib/api';
import type { LeagueCup, LeagueStanding, Team } from '@/lib/types/sports-hub';

interface HistorialResultado {
  leagueCup: LeagueCup;
  standings: LeagueStanding[];
}

export default async function LeagueCupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [historial, equipos] = await Promise.all([
    api.get<HistorialResultado>(`/sports-hub/league-cups/${id}/standings`),
    api.get<Team[]>('/sports-hub/teams'),
  ]);
  const nombrePorEquipo = new Map(equipos.map((t) => [t.id, t.name]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">{historial.leagueCup.name}</h2>
        <p className="text-sm text-neutral-500">{historial.leagueCup.format}</p>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4">Equipo</th>
            <th className="py-2 pr-4">Pts</th>
            <th className="py-2 pr-4">G</th>
            <th className="py-2 pr-4">E</th>
            <th className="py-2 pr-4">P</th>
          </tr>
        </thead>
        <tbody>
          {historial.standings.map((s) => (
            <tr key={s.id} className="border-b border-neutral-100">
              <td className="py-2 pr-4">{nombrePorEquipo.get(s.team_id) ?? '—'}</td>
              <td className="py-2 pr-4 font-medium">{s.points}</td>
              <td className="py-2 pr-4">{s.wins}</td>
              <td className="py-2 pr-4">{s.draws}</td>
              <td className="py-2 pr-4">{s.losses}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
