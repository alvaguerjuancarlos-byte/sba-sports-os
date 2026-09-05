'use client';

import { useActionState } from 'react';
import { crearProspectoAction } from './actions';
import type { AccionState } from './actions';

const ESTADO_INICIAL: AccionState = { error: null };

export function NewProspectForm() {
  const [state, formAction, pending] = useActionState(crearProspectoAction, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Nombre</span>
        <input name="name" required className="w-48 rounded border border-neutral-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Contacto</span>
        <input name="contactInfo" required placeholder="tel/email" className="w-48 rounded border border-neutral-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Origen</span>
        <input name="source" required placeholder="referido" className="w-32 rounded border border-neutral-300 px-3 py-2" />
      </label>
      <button type="submit" disabled={pending} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Creando…' : 'Crear prospecto'}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
