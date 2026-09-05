'use client';

import { useActionState } from 'react';
import { asignarRolAction } from './actions';
import type { AccionState } from './actions';

const ESTADO_INICIAL: AccionState = { error: null };

export function AssignRoleForm({ userId }: { userId: string }) {
  const accionConUserId = asignarRolAction.bind(null, userId);
  const [state, formAction, pending] = useActionState(accionConUserId, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Rol adicional</span>
        <select name="role" required defaultValue="coach" className="rounded border border-neutral-300 px-3 py-2">
          <option value="player">player</option>
          <option value="coach">coach</option>
          <option value="parent">parent</option>
          <option value="admin">admin</option>
          <option value="director">director</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Tutor (userId) — si es player menor</span>
        <input name="guardianUserId" className="rounded border border-neutral-300 px-3 py-2" />
      </label>
      <button type="submit" disabled={pending} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Agregando…' : 'Agregar rol'}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
