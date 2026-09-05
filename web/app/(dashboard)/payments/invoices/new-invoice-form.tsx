'use client';

import { useActionState } from 'react';
import { generarInvoiceAction } from './actions';
import type { AccionState } from './actions';
import type { UsuarioDeOrganizacion } from '@/lib/types/identity';
import type { MembershipPlan } from '@/lib/types/payments-billing';
import type { ProductCatalogItem } from '@/lib/types/configuration-studio';

const ESTADO_INICIAL: AccionState = { error: null };

export function NewInvoiceForm({
  atletas,
  planesActivos,
  productosActivos,
}: {
  atletas: UsuarioDeOrganizacion[];
  planesActivos: MembershipPlan[];
  productosActivos: ProductCatalogItem[];
}) {
  const [state, formAction, pending] = useActionState(generarInvoiceAction, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Atleta</span>
        <select name="athleteUserId" required defaultValue="" className="w-48 rounded border border-neutral-300 px-3 py-2">
          <option value="" disabled>
            — elegir —
          </option>
          {atletas.map((a) => (
            <option key={a.user_id} value={a.user_id}>
              {a.full_name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Plan de membresía</span>
        <select name="membershipPlanId" defaultValue="" className="w-56 rounded border border-neutral-300 px-3 py-2">
          <option value="">— cargo ad hoc (usar producto) —</option>
          {planesActivos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Producto (si es ad hoc)</span>
        <select name="productCatalogId" defaultValue="" className="w-56 rounded border border-neutral-300 px-3 py-2">
          <option value="">—</option>
          {productosActivos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — ${p.price}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Vence</span>
        <input name="dueDate" type="date" required className="rounded border border-neutral-300 px-3 py-2" />
      </label>
      <button type="submit" disabled={pending} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Generando…' : 'Generar'}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
