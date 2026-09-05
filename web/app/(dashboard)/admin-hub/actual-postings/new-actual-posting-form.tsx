'use client';

import { useActionState } from 'react';
import { registrarActualPostingAction } from './actions';
import type { AccionState } from './actions';
import type { PurchaseOrder } from '@/lib/types/admin-hub';

const ESTADO_INICIAL: AccionState = { error: null };

export function NewActualPostingForm({ ordenesDisponibles }: { ordenesDisponibles: PurchaseOrder[] }) {
  const [state, formAction, pending] = useActionState(registrarActualPostingAction, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Orden de compra</span>
        <select name="purchaseOrderId" required defaultValue="" className="w-56 rounded border border-neutral-300 px-3 py-2">
          <option value="" disabled>
            — elegir —
          </option>
          {ordenesDisponibles.map((o) => (
            <option key={o.id} value={o.id}>
              ${o.amount} — {new Date(o.created_at).toLocaleDateString('es-MX')}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Monto real</span>
        <input name="amount" type="number" step="0.01" required className="w-32 rounded border border-neutral-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Fecha</span>
        <input name="postedAt" type="date" className="rounded border border-neutral-300 px-3 py-2" />
      </label>
      <button type="submit" disabled={pending} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Guardando…' : 'Registrar'}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
