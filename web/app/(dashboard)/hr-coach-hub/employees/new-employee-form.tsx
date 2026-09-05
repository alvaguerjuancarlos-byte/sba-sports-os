'use client';

import { useActionState } from 'react';
import { crearExpedienteAction } from './actions';
import type { AccionState } from './actions';
import type { UsuarioDeDirectorio } from '@/lib/types/identity';

const ESTADO_INICIAL: AccionState = { error: null };

export function NewEmployeeForm({ personas }: { personas: UsuarioDeDirectorio[] }) {
  const [state, formAction, pending] = useActionState(crearExpedienteAction, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Persona (opcional — sin cuenta de acceso si se deja vacío)</span>
        <select name="userId" defaultValue="" className="w-56 rounded border border-neutral-300 px-3 py-2">
          <option value="">—</option>
          {personas.map((p) => (
            <option key={p.user_id} value={p.user_id}>
              {p.full_name} ({p.role})
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Tipo de contrato</span>
        <input name="contractType" required placeholder="nomina" className="w-32 rounded border border-neutral-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Fecha de contratación</span>
        <input name="hireDate" type="date" required className="rounded border border-neutral-300 px-3 py-2" />
      </label>
      <button type="submit" disabled={pending} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Creando…' : 'Crear expediente'}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
