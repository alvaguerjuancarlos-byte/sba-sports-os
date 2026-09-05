'use client';

import { useActionState } from 'react';
import { crearLeagueCupAction } from './actions';
import type { AccionState } from './actions';
import type { Season, Team } from '@/lib/types/sports-hub';

const ESTADO_INICIAL: AccionState = { error: null };

export function NewLeagueCupForm({ temporadasActivas, equiposActivos }: { temporadasActivas: Season[]; equiposActivos: Team[] }) {
  const [state, formAction, pending] = useActionState(crearLeagueCupAction, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Temporada</span>
        <select name="seasonId" required defaultValue="" className="w-40 rounded border border-neutral-300 px-3 py-2">
          <option value="" disabled>
            — elegir —
          </option>
          {temporadasActivas.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Nombre</span>
        <input name="name" required placeholder="Liga Sub-15" className="w-40 rounded border border-neutral-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Formato</span>
        <input name="format" required placeholder="liga_tabla" className="w-32 rounded border border-neutral-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Equipos participantes</span>
        <select name="teamIds" multiple required className="h-24 w-56 rounded border border-neutral-300 px-3 py-2">
          {equiposActivos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pending} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Creando…' : 'Crear competencia'}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
