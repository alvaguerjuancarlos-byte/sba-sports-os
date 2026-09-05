'use client';

import { useActionState } from 'react';
import { configurarPreferenciaAction } from './actions';
import type { AccionState } from './actions';

const ESTADO_INICIAL: AccionState = { error: null };

export function NewPreferenceForm() {
  const [state, formAction, pending] = useActionState(configurarPreferenciaAction, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Tipo de notificación</span>
        <input name="notificationType" required placeholder="payment_reminder" className="w-48 rounded border border-neutral-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Canal externo</span>
        <select name="channel" defaultValue="email" className="rounded border border-neutral-300 px-3 py-2">
          <option value="email">Email</option>
          <option value="push">Push</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input name="enabled" type="checkbox" defaultChecked />
        Habilitado
      </label>
      <button type="submit" disabled={pending} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Guardando…' : 'Guardar preferencia'}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
