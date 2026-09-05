'use client';

import { useActionState } from 'react';
import { crearSeasonAction } from './actions';
import type { AccionState } from './actions';

const ESTADO_INICIAL: AccionState = { error: null, aviso: null };

export function NewSeasonForm() {
  const [state, formAction, pending] = useActionState(crearSeasonAction, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Nombre</span>
        <input name="name" required placeholder="2026-2027" className="w-40 rounded border border-neutral-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Inicio</span>
        <input name="startDate" type="date" required className="rounded border border-neutral-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Fin</span>
        <input name="endDate" type="date" required className="rounded border border-neutral-300 px-3 py-2" />
      </label>
      <button type="submit" disabled={pending} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Creando…' : 'Crear temporada'}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      {state.aviso && <p className="w-full text-sm text-amber-700">Aviso: {state.aviso}</p>}
    </form>
  );
}
