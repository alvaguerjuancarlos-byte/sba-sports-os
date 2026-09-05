'use client';

import { useActionState } from 'react';
import { registrarEvaluacionAction } from './actions';
import type { AccionState } from './actions';

const ESTADO_INICIAL: AccionState = { error: null };

export function NewAssessmentForm({ playerId }: { playerId: string }) {
  const accion = registrarEvaluacionAction.bind(null, playerId);
  const [state, formAction, pending] = useActionState(accion, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Fecha</span>
        <input name="assessmentDate" type="date" required className="rounded border border-neutral-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Categoría</span>
        <input name="category" required placeholder="técnica" className="w-32 rounded border border-neutral-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Puntaje</span>
        <input name="score" type="number" min="0" max="100" required className="w-24 rounded border border-neutral-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Notas</span>
        <input name="notes" className="w-48 rounded border border-neutral-300 px-3 py-2" />
      </label>
      <button type="submit" disabled={pending} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Guardando…' : 'Registrar evaluación'}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
