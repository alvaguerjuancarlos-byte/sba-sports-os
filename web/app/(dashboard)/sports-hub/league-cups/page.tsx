import Link from 'next/link';
import { api } from '@/lib/api';
import type { LeagueCup, Season, Team } from '@/lib/types/sports-hub';
import { NewLeagueCupForm } from './new-league-cup-form';

export default async function LeagueCupsPage() {
  const [ligas, temporadas, equipos] = await Promise.all([
    api.get<LeagueCup[]>('/sports-hub/league-cups'),
    api.get<Season[]>('/sports-hub/seasons'),
    api.get<Team[]>('/sports-hub/teams'),
  ]);
  const temporadasActivas = temporadas.filter((s) => s.status === 'active');
  const equiposActivos = equipos.filter((t) => t.status === 'active');
  const nombrePorTemporada = new Map(temporadas.map((s) => [s.id, s.name]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Ligas y copas (UC-SPT-04/05)</h2>
        <p className="text-sm text-neutral-500">La tabla de posiciones existe desde la creación, en cero, para cada equipo participante.</p>
      </div>
      <NewLeagueCupForm temporadasActivas={temporadasActivas} equiposActivos={equiposActivos} />
      <ul className="flex flex-col gap-2">
        {ligas.map((l) => (
          <li key={l.id}>
            <Link href={`/sports-hub/league-cups/${l.id}`} className="block rounded border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50">
              <span className="font-medium">{l.name}</span>{' '}
              <span className="text-neutral-500">
                — {nombrePorTemporada.get(l.season_id) ?? '—'} · {l.format}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {ligas.length === 0 && <p className="text-sm text-neutral-500">Sin ligas o copas todavía.</p>}
    </div>
  );
}
