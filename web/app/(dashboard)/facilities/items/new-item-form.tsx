'use client';

import { useActionState } from 'react';
import { crearInventoryItemAction } from './actions';
import type { AccionState } from './actions';
import type { Venue } from '@/lib/types/calendar-rsvp';

const ESTADO_INICIAL: AccionState = { error: null };

export function NewItemForm({ venuesActivos }: { venuesActivos: Venue[] }) {
  const [state, formAction, pending] = useActionState(crearInventoryItemAction, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Sede</span>
        <select name="venueId" required defaultValue="" className="w-40 rounded border border-neutral-300 px-3 py-2">
          <option value="" disabled>
            — elegir —
          </option>
          {venuesActivos.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Nombre</span>
        <input name="name" required placeholder="Balones Sub-15" className="w-48 rounded border border-neutral-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Categoría</span>
        <input name="category" required placeholder="Equipo" className="w-32 rounded border border-neutral-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Cantidad total</span>
        <input name="quantityTotal" type="number" min="1" required className="w-24 rounded border border-neutral-300 px-3 py-2" />
      </label>
      <button type="submit" disabled={pending} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Creando…' : 'Crear material'}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
