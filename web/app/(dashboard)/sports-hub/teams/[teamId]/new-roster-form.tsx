'use client';

import { useActionState } from 'react';
import { crearRosterMembershipAction } from './actions';
import type { AccionState } from './actions';
import type { UsuarioDeDirectorio } from '@/lib/types/identity';

const ESTADO_INICIAL: AccionState = { error: null };

export function NewRosterForm({ teamId, candidatos }: { teamId: string; candidatos: UsuarioDeDirectorio[] }) {
  const accionConTeamId = crearRosterMembershipAction.bind(null, teamId);
  const [state, formAction, pending] = useActionState(accionConTeamId, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Persona</span>
        <select name="userId" required defaultValue="" className="w-48 rounded border border-neutral-300 px-3 py-2">
          <option value="" disabled>
            — elegir —
          </option>
          {candidatos.map((c) => (
            <option key={c.user_id} value={c.user_id}>
              {c.full_name} ({c.role})
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Rol en el equipo</span>
        <select name="role" defaultValue="player" className="rounded border border-neutral-300 px-3 py-2">
          <option value="player">player</option>
          <option value="coach">coach</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Dorsal</span>
        <input name="jerseyNumber" type="number" className="w-20 rounded border border-neutral-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Posición</span>
        <input name="position" className="w-28 rounded border border-neutral-300 px-3 py-2" />
      </label>
      <label className="flex items-center gap-2 text-xs text-neutral-600">
        <input name="confirmDualMembership" type="checkbox" />
        Confirmar doble militancia si ya juega este deporte en otro equipo de la temporada
      </label>
      <button type="submit" disabled={pending} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Agregando…' : 'Agregar al roster'}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
