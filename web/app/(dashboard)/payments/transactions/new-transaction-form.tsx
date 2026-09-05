'use client';

import { useActionState } from 'react';
import { registrarPagoAction } from './actions';
import type { AccionState } from './actions';
import type { Invoice } from '@/lib/types/payments-billing';

const ESTADO_INICIAL: AccionState = { error: null };

export function NewTransactionForm({ facturasPendientes }: { facturasPendientes: Invoice[] }) {
  const [state, formAction, pending] = useActionState(registrarPagoAction, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Factura</span>
        <select name="invoiceId" required defaultValue="" className="w-56 rounded border border-neutral-300 px-3 py-2">
          <option value="" disabled>
            — elegir —
          </option>
          {facturasPendientes.map((i) => (
            <option key={i.id} value={i.id}>
              ${i.amount_due} — vence {i.due_date}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">ID de transacción del proveedor</span>
        <input name="providerTxnId" required className="w-40 rounded border border-neutral-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Monto</span>
        <input name="amount" type="number" step="0.01" required className="w-28 rounded border border-neutral-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Estado</span>
        <select name="status" defaultValue="processed" className="rounded border border-neutral-300 px-3 py-2">
          <option value="processed">Procesado</option>
          <option value="failed">Fallido</option>
        </select>
      </label>
      <button type="submit" disabled={pending} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Registrando…' : 'Registrar pago'}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
