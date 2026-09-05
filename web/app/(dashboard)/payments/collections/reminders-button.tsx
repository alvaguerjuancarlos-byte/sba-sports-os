'use client';

import { useActionState } from 'react';
import { generarRecordatoriosAction } from './actions';
import type { RecordatoriosState } from './actions';

const ESTADO_INICIAL: RecordatoriosState = { cantidad: null, error: null };

export function RemindersButton() {
  const [state, formAction, pending] = useActionState(generarRecordatoriosAction, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <button type="submit" disabled={pending} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Generando…' : 'Generar recordatorios de saldo vencido'}
      </button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.cantidad !== null && <p className="text-sm text-green-700">{state.cantidad} recordatorio(s) generado(s).</p>}
    </form>
  );
}
