'use client';

import { useActionState, useState } from 'react';
import { registrarMatchEventAction } from './actions';
import type { AccionState } from './actions';
import type { MatchLineup, MatchEventType } from '@/lib/types/match-center';
import type { CallupSlot } from '@/lib/types/callup-engine';

const ESTADO_INICIAL: AccionState = { error: null };

export function MatchEventForm({
  eventId,
  activos,
  aceptadosSinAlinear,
  nombrePorUsuario,
}: {
  eventId: string;
  activos: MatchLineup[];
  aceptadosSinAlinear: CallupSlot[];
  nombrePorUsuario: Map<string, string>;
}) {
  const accion = registrarMatchEventAction.bind(null, eventId);
  const [state, formAction, pending] = useActionState(accion, ESTADO_INICIAL);
  const [tipo, setTipo] = useState<MatchEventType>('goal');

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 rounded border border-neutral-200 p-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Tipo</span>
        <select name="type" value={tipo} onChange={(e) => setTipo(e.target.value as MatchEventType)} className="rounded border border-neutral-300 px-3 py-2">
          <option value="goal">Gol</option>
          <option value="card">Tarjeta</option>
          <option value="substitution">Sustitución</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Minuto</span>
        <input name="minute" type="number" min="0" required className="w-20 rounded border border-neutral-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">{tipo === 'substitution' ? 'Jugador que sale' : 'Jugador'}</span>
        <select name="playerLineupId" required defaultValue="" className="w-48 rounded border border-neutral-300 px-3 py-2">
          <option value="" disabled>
            — elegir —
          </option>
          {activos.map((l) => (
            <option key={l.id} value={l.id}>
              {nombrePorUsuario.get(l.user_id) ?? l.user_id}
            </option>
          ))}
        </select>
      </label>

      {tipo === 'card' && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Color</span>
          <select name="cardColor" defaultValue="yellow" className="rounded border border-neutral-300 px-3 py-2">
            <option value="yellow">Amarilla</option>
            <option value="red">Roja</option>
          </select>
        </label>
      )}

      {tipo === 'substitution' && (
        <>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">Jugador que entra</span>
            <select name="substituteCallupSlotId" required defaultValue="" className="w-48 rounded border border-neutral-300 px-3 py-2">
              <option value="" disabled>
                — elegir —
              </option>
              {aceptadosSinAlinear.map((s) => (
                <option key={s.id} value={s.id}>
                  {nombrePorUsuario.get(s.user_id) ?? s.user_id}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">Posición</span>
            <input name="substitutePosition" required className="w-28 rounded border border-neutral-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">Formación</span>
            <input name="substituteFormationSlot" required className="w-20 rounded border border-neutral-300 px-3 py-2" />
          </label>
        </>
      )}

      <button type="submit" disabled={pending} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Registrando…' : 'Registrar'}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
