import { api } from '@/lib/api';
import type { Season, Team } from '@/lib/types/sports-hub';
import { NewTeamForm } from './new-team-form';
import { TeamRow } from './team-row';

export default async function TeamsPage() {
  const [equipos, temporadas] = await Promise.all([
    api.get<Team[]>('/sports-hub/teams'),
    api.get<Season[]>('/sports-hub/seasons'),
  ]);
  const temporadasActivas = temporadas.filter((s) => s.status === 'active');
  const nombrePorTemporada = new Map(temporadas.map((s) => [s.id, s.name]));

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-neutral-900">Equipos (UC-SPT-02)</h2>
      <NewTeamForm temporadasActivas={temporadasActivas} />
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4">Nombre</th>
            <th className="py-2 pr-4">Temporada</th>
            <th className="py-2 pr-4">Categoría</th>
            <th className="py-2 pr-4">Deporte</th>
            <th className="py-2 pr-4">Estado</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {equipos.map((t) => (
            <TeamRow key={t.id} team={t} nombreTemporada={nombrePorTemporada.get(t.season_id) ?? '—'} />
          ))}
        </tbody>
      </table>
      {equipos.length === 0 && <p className="text-sm text-neutral-500">Sin equipos todavía.</p>}
    </div>
  );
}
