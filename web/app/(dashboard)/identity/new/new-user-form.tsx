'use client';

import { useActionState } from 'react';
import { altaUsuarioAction } from './actions';
import type { AltaUsuarioState } from './actions';

const ESTADO_INICIAL: AltaUsuarioState = { error: null };

export function NewUserForm() {
  const [state, formAction, pending] = useActionState(altaUsuarioAction, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Nombre completo</span>
        <input name="fullName" required className="rounded border border-neutral-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Email</span>
        <input name="email" type="email" className="rounded border border-neutral-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Teléfono (si no hay email)</span>
        <input name="phone" className="rounded border border-neutral-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Fecha de nacimiento</span>
        <input name="dateOfBirth" type="date" required className="rounded border border-neutral-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Rol</span>
        <select name="role" required defaultValue="player" className="rounded border border-neutral-300 px-3 py-2">
          <option value="player">player</option>
          <option value="coach">coach</option>
          <option value="parent">parent</option>
          <option value="admin">admin</option>
          <option value="director">director</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Tutor (userId) — solo si es player menor de edad</span>
        <input name="guardianUserId" className="rounded border border-neutral-300 px-3 py-2" placeholder="requerido si es menor (UC-ID-03)" />
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Guardando…' : 'Dar de alta'}
      </button>
    </form>
  );
}
