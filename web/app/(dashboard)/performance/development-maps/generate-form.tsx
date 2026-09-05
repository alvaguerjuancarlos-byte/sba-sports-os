'use client';

import { useActionState } from 'react';
import { generarDevelopmentMapAction } from './actions';
import type { AccionState } from './actions';
import type { DevelopmentMapScope } from '@/lib/types/performance';

const ESTADO_INICIAL: AccionState = { error: null };

export function GenerateForm({ scope, scopeRefId, dateRangeStart, dateRangeEnd }: { scope: DevelopmentMapScope; scopeRefId: string; dateRangeStart?: string; dateRangeEnd?: string }) {
  const accion = generarDevelopmentMapAction.bind(null, scope);
  const [state, formAction, pending] = useActionState(accion, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="scopeRefId" value={scopeRefId} />
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Desde</span>
        <input name="dateRangeStart" type="date" required defaultValue={dateRangeStart} className="rounded border border-neutral-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Hasta</span>
        <input name="dateRangeEnd" type="date" required defaultValue={dateRangeEnd} className="rounded border border-neutral-300 px-3 py-2" />
      </label>
      <button type="submit" disabled={pending} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Generando…' : 'Generar / actualizar'}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
