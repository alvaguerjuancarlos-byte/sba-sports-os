'use client';

import { useActionState } from 'react';
import { actualizarMarcadorRivalAction } from './actions';
import type { AccionState } from './actions';

const ESTADO_INICIAL: AccionState = { error: null };

export function OpponentScoreForm({ eventId, actual }: { eventId: string; actual: number }) {
  const accion = actualizarMarcadorRivalAction.bind(null, eventId);
  const [state, formAction, pending] = useActionState(accion, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Marcador del rival</span>
        <input name="opponentScore" type="number" min="0" defaultValue={actual} className="w-20 rounded border border-neutral-300 px-3 py-2" />
      </label>
      <button type="submit" disabled={pending} className="rounded border border-neutral-300 px-3 py-2 text-sm font-medium disabled:opacity-50">
        {pending ? 'Guardando…' : 'Actualizar'}
      </button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
