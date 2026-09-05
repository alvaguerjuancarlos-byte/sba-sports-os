'use client';

import { useActionState } from 'react';
import { crearMembershipPlanAction } from './actions';
import type { AccionState } from './actions';
import type { UsuarioDeOrganizacion } from '@/lib/types/identity';
import type { ProductCatalogItem } from '@/lib/types/configuration-studio';

const ESTADO_INICIAL: AccionState = { error: null };

export function NewMembershipPlanForm({ atletas, productosActivos }: { atletas: UsuarioDeOrganizacion[]; productosActivos: ProductCatalogItem[] }) {
  const [state, formAction, pending] = useActionState(crearMembershipPlanAction, ESTADO_INICIAL);

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
        <span className="font-medium text-neutral-700">Producto de catálogo</span>
        <select name="productCatalogId" required defaultValue="" className="w-56 rounded border border-neutral-300 px-3 py-2">
          <option value="" disabled>
            — elegir —
          </option>
          {productosActivos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — ${p.price}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Moneda</span>
        <input name="currency" required defaultValue="MXN" className="w-20 rounded border border-neutral-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Ciclo</span>
        <select name="billingCycle" required defaultValue="monthly" className="rounded border border-neutral-300 px-3 py-2">
          <option value="monthly">Mensual</option>
          <option value="one_time">Único</option>
        </select>
      </label>
      <button type="submit" disabled={pending} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Guardando…' : 'Crear plan'}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
