'use client';

import { useActionState } from 'react';
import { crearEventoAction } from './actions';
import type { AccionState } from './actions';
import type { Venue } from '@/lib/types/calendar-rsvp';
import type { LeagueCup, Team } from '@/lib/types/sports-hub';

const ESTADO_INICIAL: AccionState = { error: null, conflictos: null, invitacionesGeneradas: null };

export function NewEventForm({ equiposActivos, ligas, venuesActivos, puedeForzarTraslape }: { equiposActivos: Team[]; ligas: LeagueCup[]; venuesActivos: Venue[]; puedeForzarTraslape: boolean }) {
  const [state, formAction, pending] = useActionState(crearEventoAction, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Tipo</span>
          <select name="type" defaultValue="training" className="rounded border border-neutral-300 px-3 py-2">
            <option value="training">Entrenamiento</option>
            <option value="match">Partido</option>
            <option value="tournament">Torneo</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Equipo</span>
          <select name="teamId" defaultValue="" className="w-48 rounded border border-neutral-300 px-3 py-2">
            <option value="">— sin equipo (multi-equipo) —</option>
            {equiposActivos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Liga/copa</span>
          <select name="leagueCupId" defaultValue="" className="w-48 rounded border border-neutral-300 px-3 py-2">
            <option value="">—</option>
            {ligas.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
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
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Inicio</span>
          <input name="startAt" type="datetime-local" required className="rounded border border-neutral-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Fin</span>
          <input name="endAt" type="datetime-local" required className="rounded border border-neutral-300 px-3 py-2" />
        </label>
        {puedeForzarTraslape && (
          <label className="flex items-center gap-2 text-xs text-neutral-600">
            <input name="forceOverlap" type="checkbox" />
            Forzar traslape de horario en esta sede
          </label>
        )}
        <button type="submit" disabled={pending} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
          {pending ? 'Creando…' : 'Crear evento'}
        </button>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.conflictos && state.conflictos.length > 0 && (
        <ul className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          {state.conflictos.map((c) => (
            <li key={c.id}>
              Conflicto: {c.startAt} — {c.endAt}
            </li>
          ))}
        </ul>
      )}
      {state.invitacionesGeneradas !== null && (
        <p className="text-sm text-green-700">Evento creado — {state.invitacionesGeneradas} invitación(es) de RSVP generada(s).</p>
      )}
    </form>
  );
}
