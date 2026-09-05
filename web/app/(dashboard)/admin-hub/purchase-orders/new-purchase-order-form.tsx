'use client';

import { useActionState } from 'react';
import { emitirPurchaseOrderAction } from './actions';
import type { AccionState } from './actions';
import type { PurchaseRequest, Vendor } from '@/lib/types/admin-hub';

const ESTADO_INICIAL: AccionState = { error: null };

export function NewPurchaseOrderForm({
  solicitudesDisponibles,
  vendoresActivos,
}: {
  solicitudesDisponibles: PurchaseRequest[];
  vendoresActivos: Vendor[];
}) {
  const [state, formAction, pending] = useActionState(emitirPurchaseOrderAction, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Solicitud aprobada</span>
        <select name="purchaseRequestId" required defaultValue="" className="w-56 rounded border border-neutral-300 px-3 py-2">
          <option value="" disabled>
            — elegir —
          </option>
          {solicitudesDisponibles.map((s) => (
            <option key={s.id} value={s.id}>
              ${s.amount} — {s.justification ?? 'sin justificación'}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Proveedor</span>
        <select name="vendorId" required defaultValue="" className="w-56 rounded border border-neutral-300 px-3 py-2">
          <option value="" disabled>
            — elegir —
          </option>
          {vendoresActivos.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pending} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Emitiendo…' : 'Emitir orden'}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
