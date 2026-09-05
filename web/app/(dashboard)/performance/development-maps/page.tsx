import { api } from '@/lib/api';
import { listarDirectorio } from '@/lib/identity';
import type { Team } from '@/lib/types/sports-hub';
import { ScopePicker } from './scope-picker';

export default async function DevelopmentMapsIndexPage() {
  const [directorio, equipos] = await Promise.all([listarDirectorio(), api.get<Team[]>('/sports-hub/teams')]);
  const jugadores = directorio.filter((u) => u.role === 'player' && u.status === 'active');
  const equiposActivos = equipos.filter((t) => t.status === 'active');

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-neutral-900">Development Map (UC-PRF-01/02/04)</h2>
      <ScopePicker jugadores={jugadores} equipos={equiposActivos} />
      <a href="/performance/development-maps/academy" className="w-fit rounded border border-neutral-300 px-3 py-2 text-sm font-medium">
        Ver academia completa
      </a>
    </div>
  );
}
