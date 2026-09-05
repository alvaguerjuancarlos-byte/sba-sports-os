'use client';

import { useActionState } from 'react';
import { cerrarPartidoAction } from './actions';
import type { AccionState } from './actions';

const ESTADO_INICIAL: AccionState = { error: null };

export function CloseForm({ eventId }: { eventId: string }) {
  const accion = cerrarPartidoAction.bind(null, eventId);
  const [state, formAction, pending] = useActionState(accion, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Minuto final</span>
        <input name="finalMinute" type="number" min="1" required className="w-24 rounded border border-neutral-300 px-3 py-2" />
      </label>
      <button type="submit" disabled={pending} className="rounded bg-red-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Cerrando…' : 'Cerrar partido'}
      </button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
