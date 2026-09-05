import { api } from '@/lib/api';
import type { RosterMembership, Team } from '@/lib/types/sports-hub';
import type { UsuarioDeOrganizacion } from '@/lib/types/identity';
import { NewRosterForm } from './new-roster-form';
import { RosterRow } from './roster-row';

export default async function TeamRosterPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;

  const [equipos, roster, usuarios] = await Promise.all([
    api.get<Team[]>('/sports-hub/teams'),
    api.get<RosterMembership[]>(`/sports-hub/teams/${teamId}/roster`),
    api.get<UsuarioDeOrganizacion[]>('/identity/users'),
  ]);

  const team = equipos.find((t) => t.id === teamId);
  if (!team) {
    return <p className="text-sm text-neutral-500">No se encontró este equipo.</p>;
  }

  const nombrePorUsuario = new Map(usuarios.map((u) => [u.user_id, u.full_name]));
  const idsActivos = new Set(roster.filter((r) => r.status === 'active').map((r) => r.user_id));
  const candidatos = usuarios.filter((u) => (u.role === 'player' || u.role === 'coach') && u.status === 'active' && !idsActivos.has(u.user_id));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">{team.name}</h2>
        <p className="text-sm text-neutral-500">
          {team.category} · {team.sport}
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Roster (UC-SPT-03)</h3>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="py-2 pr-4">Persona</th>
              <th className="py-2 pr-4">Rol</th>
              <th className="py-2 pr-4">Dorsal / posición</th>
              <th className="py-2 pr-4">Estado</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {roster.map((r) => (
              <RosterRow key={r.id} teamId={teamId} membership={r} nombrePersona={nombrePorUsuario.get(r.user_id) ?? '—'} />
            ))}
          </tbody>
        </table>
        {roster.length === 0 && <p className="text-sm text-neutral-500">Sin miembros todavía.</p>}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Incorporar al roster</h3>
        <NewRosterForm teamId={teamId} candidatos={candidatos} />
      </div>
    </div>
  );
}
