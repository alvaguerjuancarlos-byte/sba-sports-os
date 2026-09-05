'use client';

import { useActionState } from 'react';
import { convertirProspectoAction } from './actions';
import type { AccionState } from './actions';
import type { ProductCatalogItem } from '@/lib/types/configuration-studio';

const ESTADO_INICIAL: AccionState = { error: null };

export function ConvertForm({ prospectId, productosActivos }: { prospectId: string; productosActivos: ProductCatalogItem[] }) {
  const accion = convertirProspectoAction.bind(null, prospectId);
  const [state, formAction, pending] = useActionState(accion, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Fecha de nacimiento</span>
        <input name="dateOfBirth" type="date" required className="rounded border border-neutral-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Email</span>
        <input name="email" type="email" className="w-48 rounded border border-neutral-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Teléfono</span>
        <input name="phone" className="w-36 rounded border border-neutral-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Tutor (userId) — si es menor</span>
        <input name="guardianUserId" className="w-64 rounded border border-neutral-300 px-3 py-2" />
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
        <select name="billingCycle" defaultValue="monthly" className="rounded border border-neutral-300 px-3 py-2">
          <option value="monthly">Mensual</option>
          <option value="one_time">Único</option>
        </select>
      </label>
      <button type="submit" disabled={pending} className="rounded bg-green-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Convirtiendo…' : 'Convertir a inscripción'}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
