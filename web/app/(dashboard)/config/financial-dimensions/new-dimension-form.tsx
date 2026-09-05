'use client';

import { useActionState } from 'react';
import { crearDimensionAction } from './actions';
import type { AccionState } from './actions';
import type { FinancialDimension } from '@/lib/types/configuration-studio';

const ESTADO_INICIAL: AccionState = { error: null };

export function NewDimensionForm({ dimensionesActivas }: { dimensionesActivas: FinancialDimension[] }) {
  const [state, formAction, pending] = useActionState(crearDimensionAction, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Tipo</span>
        <select name="type" required defaultValue="class" className="rounded border border-neutral-300 px-3 py-2">
          <option value="class">class</option>
          <option value="group">group</option>
          <option value="budget_line">budget_line</option>
          <option value="concept">concept</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Nombre</span>
        <input name="name" required className="rounded border border-neutral-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Padre (opcional)</span>
        <select name="parentId" defaultValue="" className="rounded border border-neutral-300 px-3 py-2">
          <option value="">— ninguno —</option>
          {dimensionesActivas.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.type})
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pending} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Guardando…' : 'Crear'}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
