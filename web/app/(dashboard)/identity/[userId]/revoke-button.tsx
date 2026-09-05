'use client';

import { useState, useTransition } from 'react';
import { revocarAccesoAction } from './actions';

export function RevokeButton({ userTenantRoleId, userId }: { userTenantRoleId: string; userId: string }) {
  const [pending, startTransition] = useTransition();
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <button type="button" onClick={() => setConfirmando(true)} className="text-xs text-red-600 underline">
        Revocar
      </button>
    );
  }

  return (
    <span className="text-xs">
      ¿Seguro?{' '}
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => revocarAccesoAction(userTenantRoleId, userId))}
        className="font-medium text-red-600 underline"
      >
        {pending ? 'Revocando…' : 'Sí, revocar'}
      </button>{' '}
      <button type="button" onClick={() => setConfirmando(false)} className="text-neutral-500 underline">
        Cancelar
      </button>
    </span>
  );
}
