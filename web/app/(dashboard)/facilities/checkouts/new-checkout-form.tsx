'use client';

import { useActionState } from 'react';
import { checkoutAction } from './actions';
import type { AccionState } from './actions';
import type { InventoryItem } from '@/lib/types/facilities-inventory';

const ESTADO_INICIAL: AccionState = { error: null };

export function NewCheckoutForm({ itemsActivos }: { itemsActivos: InventoryItem[] }) {
  const [state, formAction, pending] = useActionState(checkoutAction, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Material</span>
        <select name="inventoryItemId" required defaultValue="" className="w-56 rounded border border-neutral-300 px-3 py-2">
          <option value="" disabled>
            — elegir —
          </option>
          {itemsActivos.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Cantidad</span>
        <input name="quantity" type="number" min="1" required className="w-24 rounded border border-neutral-300 px-3 py-2" />
      </label>
      <button type="submit" disabled={pending} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Registrando…' : 'Hacer check-out'}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
