'use client';

import { useActionState } from 'react';
import { generarConvocatoriaAction } from './actions';
import type { AccionState } from './actions';

const ESTADO_INICIAL: AccionState = { error: null };

export function GenerateForm({ eventId }: { eventId: string }) {
  const accionConEventId = generarConvocatoriaAction.bind(null, eventId);
  const [state, formAction, pending] = useActionState(accionConEventId, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Formato (debe existir una regla activa, UC-CUP-06)</span>
        <input name="format" required placeholder="Fut7" className="w-32 rounded border border-neutral-300 px-3 py-2" />
      </label>
      <button type="submit" disabled={pending} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Generando…' : 'Generar convocatoria'}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
