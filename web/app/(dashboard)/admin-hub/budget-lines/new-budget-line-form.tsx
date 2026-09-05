'use client';

import { useActionState } from 'react';
import { crearBudgetLineAction } from './actions';
import type { AccionState } from './actions';
import type { FinancialDimension } from '@/lib/types/configuration-studio';

const ESTADO_INICIAL: AccionState = { error: null };

export function NewBudgetLineForm({ dimensionesActivas }: { dimensionesActivas: FinancialDimension[] }) {
  const [state, formAction, pending] = useActionState(crearBudgetLineAction, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Dimensión financiera</span>
        <select name="financialDimensionId" required defaultValue="" className="rounded border border-neutral-300 px-3 py-2">
          <option value="" disabled>
            — elegir —
          </option>
          {dimensionesActivas.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Temporada</span>
        <input name="season" required placeholder="2026-2027" className="w-32 rounded border border-neutral-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Periodo</span>
        <input name="period" required placeholder="Q1" className="w-24 rounded border border-neutral-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Presupuesto</span>
        <input name="amountBudgeted" type="number" step="0.01" required className="w-32 rounded border border-neutral-300 px-3 py-2" />
      </label>
      <button type="submit" disabled={pending} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Guardando…' : 'Crear'}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
