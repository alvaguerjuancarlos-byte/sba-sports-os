'use client';

import { useRouter } from 'next/navigation';
import type { UsuarioDeDirectorio } from '@/lib/types/identity';
import type { Team } from '@/lib/types/sports-hub';

export function ScopePicker({ jugadores, equipos }: { jugadores: UsuarioDeDirectorio[]; equipos: Team[] }) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <p className="w-full text-sm font-medium text-neutral-700">Por atleta</p>
        <select
          onChange={(e) => e.target.value && router.push(`/performance/development-maps/athletes/${e.target.value}`)}
          defaultValue=""
          className="w-56 rounded border border-neutral-300 px-3 py-2"
        >
          <option value="" disabled>
            — elegir —
          </option>
          {jugadores.map((j) => (
            <option key={j.user_id} value={j.user_id}>
              {j.full_name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <p className="w-full text-sm font-medium text-neutral-700">Por equipo</p>
        <select
          onChange={(e) => e.target.value && router.push(`/performance/development-maps/teams/${e.target.value}`)}
          defaultValue=""
          className="w-56 rounded border border-neutral-300 px-3 py-2"
        >
          <option value="" disabled>
            — elegir —
          </option>
          {equipos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
