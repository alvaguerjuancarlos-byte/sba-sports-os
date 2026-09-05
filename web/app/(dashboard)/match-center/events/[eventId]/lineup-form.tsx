'use client';

import { useActionState, useTransition } from 'react';
import { agregarTitularAction, iniciarPartidoAction } from './actions';
import type { AccionState } from './actions';
import type { CallupSlot } from '@/lib/types/callup-engine';

const ESTADO_INICIAL: AccionState = { error: null };

export function LineupForm({
  eventId,
  aceptados,
  yaAlineados,
  nombrePorUsuario,
}: {
  eventId: string;
  aceptados: CallupSlot[];
  yaAlineados: Set<string>;
  nombrePorUsuario: Map<string, string>;
}) {
  const accion = agregarTitularAction.bind(null, eventId);
  const [state, formAction, pending] = useActionState(accion, ESTADO_INICIAL);
  const [iniciando, startTransition] = useTransition();

  const disponibles = aceptados.filter((s) => !yaAlineados.has(s.id));

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Titular (solo convocados aceptados)</span>
          <select name="callupSlotId" required defaultValue="" className="w-48 rounded border border-neutral-300 px-3 py-2">
            <option value="" disabled>
              — elegir —
            </option>
            {disponibles.map((s) => (
              <option key={s.id} value={s.id}>
                {nombrePorUsuario.get(s.user_id) ?? s.user_id}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Posición</span>
          <input name="position" required placeholder="Delantero" className="w-32 rounded border border-neutral-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Formación</span>
          <input name="formationSlot" required placeholder="9" className="w-20 rounded border border-neutral-300 px-3 py-2" />
        </label>
        <button type="submit" disabled={pending} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
          {pending ? 'Agregando…' : 'Agregar titular'}
        </button>
      </form>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="button"
        disabled={iniciando || yaAlineados.size === 0}
        onClick={() => startTransition(async () => iniciarPartidoAction(eventId))}
        className="w-fit rounded border border-neutral-300 px-3 py-2 text-sm font-medium disabled:opacity-50"
      >
        {iniciando ? 'Iniciando…' : 'Iniciar partido'}
      </button>
    </div>
  );
}
