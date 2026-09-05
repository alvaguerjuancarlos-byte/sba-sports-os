'use client';

import { useActionState } from 'react';
import { registrarNotaMedicaAction, registrarNotaNutricionalAction } from './actions';
import type { AccionState } from './actions';

const ESTADO_INICIAL: AccionState = { error: null };

export function MedicalNutritionForms({ athleteId }: { athleteId: string }) {
  const accionMedica = registrarNotaMedicaAction.bind(null, athleteId);
  const accionNutricional = registrarNotaNutricionalAction.bind(null, athleteId);
  const [stateMedica, formActionMedica, pendingMedica] = useActionState(accionMedica, ESTADO_INICIAL);
  const [stateNutricional, formActionNutricional, pendingNutricional] = useActionState(accionNutricional, ESTADO_INICIAL);

  return (
    <div className="flex flex-col gap-4">
      <form action={formActionMedica} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Tipo</span>
          <select name="noteType" defaultValue="condition" className="rounded border border-neutral-300 px-3 py-2">
            <option value="condition">Condición</option>
            <option value="allergy">Alergia</option>
            <option value="restriction">Restricción</option>
            <option value="injury">Lesión</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Descripción</span>
          <input name="description" required className="w-64 rounded border border-neutral-300 px-3 py-2" />
        </label>
        <button type="submit" disabled={pendingMedica} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
          {pendingMedica ? 'Guardando…' : 'Agregar nota médica'}
        </button>
        {stateMedica.error && <p className="w-full text-sm text-red-600">{stateMedica.error}</p>}
      </form>

      <form action={formActionNutricional} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Nota nutricional</span>
          <input name="note" required className="w-64 rounded border border-neutral-300 px-3 py-2" />
        </label>
        <button type="submit" disabled={pendingNutricional} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
          {pendingNutricional ? 'Guardando…' : 'Agregar nota nutricional'}
        </button>
        {stateNutricional.error && <p className="w-full text-sm text-red-600">{stateNutricional.error}</p>}
      </form>
    </div>
  );
}
