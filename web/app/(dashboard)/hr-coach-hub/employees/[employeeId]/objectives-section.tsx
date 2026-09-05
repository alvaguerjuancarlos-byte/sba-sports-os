'use client';

import { useActionState, useTransition } from 'react';
import { definirObjetivoAction, actualizarStatusObjetivoAction } from './actions';
import type { AccionState } from './actions';
import type { CoachObjective, CoachObjectiveStatus } from '@/lib/types/hr-coach-hub';

const ESTADO_INICIAL: AccionState = { error: null };

const ETIQUETA: Record<CoachObjectiveStatus, string> = {
  open: 'Abierto',
  in_progress: 'En progreso',
  achieved: 'Logrado',
  not_achieved: 'No logrado',
};

function ObjectiveRow({ employeeId, objetivo }: { employeeId: string; objetivo: CoachObjective }) {
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b border-neutral-100">
      <td className="py-2 pr-4">{objetivo.period}</td>
      <td className="py-2 pr-4">{objetivo.objective_text}</td>
      <td className="py-2 pr-4">
        <select
          value={objetivo.status}
          disabled={pending}
          onChange={(e) => startTransition(async () => actualizarStatusObjetivoAction(employeeId, objetivo.id, e.target.value as CoachObjectiveStatus))}
          className="rounded border border-neutral-300 px-2 py-1 text-xs"
        >
          {(Object.keys(ETIQUETA) as CoachObjectiveStatus[]).map((s) => (
            <option key={s} value={s}>
              {ETIQUETA[s]}
            </option>
          ))}
        </select>
      </td>
    </tr>
  );
}

export function ObjectivesSection({ employeeId, objetivos, puedeDefinir }: { employeeId: string; objetivos: CoachObjective[]; puedeDefinir: boolean }) {
  const accion = definirObjetivoAction.bind(null, employeeId);
  const [state, formAction, pending] = useActionState(accion, ESTADO_INICIAL);

  return (
    <div className="flex flex-col gap-3">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4">Periodo</th>
            <th className="py-2 pr-4">Objetivo</th>
            <th className="py-2 pr-4">Estado</th>
          </tr>
        </thead>
        <tbody>
          {objetivos.map((o) => (
            <ObjectiveRow key={o.id} employeeId={employeeId} objetivo={o} />
          ))}
        </tbody>
      </table>
      {objetivos.length === 0 && <p className="text-sm text-neutral-500">Sin objetivos todavía.</p>}

      {puedeDefinir && (
        <form action={formAction} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">Periodo</span>
            <input name="period" required placeholder="2026-Q3" className="w-28 rounded border border-neutral-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">Objetivo</span>
            <input name="objectiveText" required className="w-64 rounded border border-neutral-300 px-3 py-2" />
          </label>
          <button type="submit" disabled={pending} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
            {pending ? 'Guardando…' : 'Definir objetivo'}
          </button>
          {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
        </form>
      )}
    </div>
  );
}
