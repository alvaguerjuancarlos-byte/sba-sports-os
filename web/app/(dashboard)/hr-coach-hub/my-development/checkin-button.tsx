'use client';

import { useTransition } from 'react';
import { registrarAsistenciaAction } from './actions';

export function CheckinButton({ employeeId }: { employeeId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => registrarAsistenciaAction(employeeId))}
      className="w-fit rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
    >
      {pending ? 'Registrando…' : 'Registrar mi asistencia (UC-HR-02)'}
    </button>
  );
}
