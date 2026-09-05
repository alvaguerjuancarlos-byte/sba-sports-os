'use client';

import { useActionState } from 'react';
import { consultarSugerenciaAction } from './actions';
import type { SugerenciaState } from './actions';

const ESTADO_INICIAL: SugerenciaState = { error: null, recommendation: null, insufficientData: false };

export function SuggestionButton({ athleteId, dateRangeStart, dateRangeEnd }: { athleteId: string; dateRangeStart: string; dateRangeEnd: string }) {
  const accion = consultarSugerenciaAction.bind(null, athleteId, dateRangeStart, dateRangeEnd);
  const [state, formAction, pending] = useActionState(accion, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <button type="submit" disabled={pending} className="rounded border border-neutral-300 px-3 py-2 text-sm font-medium disabled:opacity-50">
        {pending ? 'Consultando…' : 'Consultar sugerencia (UC-PRF-03)'}
      </button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.insufficientData && <p className="text-sm text-amber-700">Datos insuficientes para una sugerencia (mínimo 2 dimensiones con datos y 1 partido jugado).</p>}
      {state.recommendation && <p className="rounded border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">{state.recommendation}</p>}
    </form>
  );
}
