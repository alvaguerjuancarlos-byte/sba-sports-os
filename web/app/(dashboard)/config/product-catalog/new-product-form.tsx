'use client';

import { useActionState } from 'react';
import { crearVersionProductoAction } from './actions';
import type { AccionState } from './actions';
import type { FinancialDimension } from '@/lib/types/configuration-studio';

const ESTADO_INICIAL: AccionState = { error: null };

export function NewProductForm({ dimensionesActivas }: { dimensionesActivas: FinancialDimension[] }) {
  const [state, formAction, pending] = useActionState(crearVersionProductoAction, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Product key (vacío = nuevo producto)</span>
        <input name="productKey" className="rounded border border-neutral-300 px-3 py-2" placeholder="ej. mensualidad-futbol" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Nombre</span>
        <input name="name" required className="rounded border border-neutral-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Precio</span>
        <input name="price" type="number" step="0.01" required className="w-28 rounded border border-neutral-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Dimensión financiera</span>
        <select name="financialDimensionId" defaultValue="" className="rounded border border-neutral-300 px-3 py-2">
          <option value="">— ninguna —</option>
          {dimensionesActivas.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Vigente desde</span>
        <input name="effectiveDate" type="date" required className="rounded border border-neutral-300 px-3 py-2" />
      </label>
      <button type="submit" disabled={pending} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Guardando…' : 'Crear versión'}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
