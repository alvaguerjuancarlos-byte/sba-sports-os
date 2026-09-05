'use client';

import { useActionState } from 'react';
import { registrarCheckinFacialAction, registrarCheckinManualAction } from './actions';
import type { AccionState } from './actions';
import type { UsuarioDeDirectorio } from '@/lib/types/identity';

const ESTADO_INICIAL: AccionState = { error: null };

export function CheckinForms({ eventId, faltantesConNombre }: { eventId: string; faltantesConNombre: UsuarioDeDirectorio[] }) {
  const accionFacial = registrarCheckinFacialAction.bind(null, eventId);
  const accionManual = registrarCheckinManualAction.bind(null, eventId);
  const [stateFacial, formActionFacial, pendingFacial] = useActionState(accionFacial, ESTADO_INICIAL);
  const [stateManual, formActionManual, pendingManual] = useActionState(accionManual, ESTADO_INICIAL);

  return (
    <div className="flex flex-col gap-3">
      <form action={formActionManual} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Check-in manual (UC-ATT-02)</span>
          <select name="userId" required defaultValue="" className="w-56 rounded border border-neutral-300 px-3 py-2">
            <option value="" disabled>
              — elegir —
            </option>
            {faltantesConNombre.map((u) => (
              <option key={u.user_id} value={u.user_id}>
                {u.full_name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={pendingManual} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
          {pendingManual ? 'Registrando…' : 'Confirmar presencia'}
        </button>
      </form>
      {stateManual.error && <p className="text-sm text-red-600">{stateManual.error}</p>}

      <form action={formActionFacial} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Check-in facial (UC-ATT-01) — requiere consentimiento y template ya registrados</span>
          <select name="userId" required defaultValue="" className="w-56 rounded border border-neutral-300 px-3 py-2">
            <option value="" disabled>
              — elegir —
            </option>
            {faltantesConNombre.map((u) => (
              <option key={u.user_id} value={u.user_id}>
                {u.full_name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={pendingFacial} className="rounded border border-neutral-300 px-3 py-2 text-sm font-medium disabled:opacity-50">
          {pendingFacial ? 'Registrando…' : 'Confirmar facial'}
        </button>
      </form>
      {stateFacial.error && <p className="text-sm text-red-600">{stateFacial.error}</p>}
    </div>
  );
}
