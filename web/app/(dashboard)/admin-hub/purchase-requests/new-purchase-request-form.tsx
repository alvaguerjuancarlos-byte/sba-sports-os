'use client';

import { useActionState } from 'react';
import { crearPurchaseRequestAction } from './actions';
import type { AccionState } from './actions';
import type { BudgetLine } from '@/lib/types/admin-hub';

const ESTADO_INICIAL: AccionState = { error: null };

export function NewPurchaseRequestForm({ budgetLinesActivas }: { budgetLinesActivas: BudgetLine[] }) {
  const [state, formAction, pending] = useActionState(crearPurchaseRequestAction, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Budget line</span>
        <select name="budgetLineId" required defaultValue="" className="w-56 rounded border border-neutral-300 px-3 py-2">
          <option value="" disabled>
            — elegir —
          </option>
          {budgetLinesActivas.map((b) => (
            <option key={b.id} value={b.id}>
              {b.season} / {b.period}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Monto</span>
        <input name="amount" type="number" step="0.01" required className="w-32 rounded border border-neutral-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Justificación</span>
        <input name="justification" className="w-64 rounded border border-neutral-300 px-3 py-2" />
      </label>
      <button type="submit" disabled={pending} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Guardando…' : 'Solicitar'}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
