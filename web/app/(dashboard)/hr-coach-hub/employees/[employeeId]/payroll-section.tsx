'use client';

import { useActionState } from 'react';
import { capturarPayrollInputAction } from './actions';
import type { AccionState } from './actions';
import type { PayrollInput } from '@/lib/types/hr-coach-hub';

const ESTADO_INICIAL: AccionState = { error: null };

export function PayrollSection({ employeeId, insumos }: { employeeId: string; insumos: PayrollInput[] }) {
  const accion = capturarPayrollInputAction.bind(null, employeeId);
  const [state, formAction, pending] = useActionState(accion, ESTADO_INICIAL);

  return (
    <div className="flex flex-col gap-3">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4">Periodo</th>
            <th className="py-2 pr-4">Horas</th>
            <th className="py-2 pr-4">Bonos</th>
            <th className="py-2 pr-4">Notas de deducción</th>
          </tr>
        </thead>
        <tbody>
          {insumos.map((i) => (
            <tr key={i.id} className="border-b border-neutral-100">
              <td className="py-2 pr-4">{i.period}</td>
              <td className="py-2 pr-4">{i.hours ?? '—'}</td>
              <td className="py-2 pr-4">${i.bonuses}</td>
              <td className="py-2 pr-4 text-neutral-500">{i.deductions_notes ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {insumos.length === 0 && <p className="text-sm text-neutral-500">Sin insumos de nómina todavía.</p>}

      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Periodo</span>
          <input name="period" required placeholder="2026-09" className="w-28 rounded border border-neutral-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Horas</span>
          <input name="hours" type="number" step="0.5" className="w-24 rounded border border-neutral-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Bonos</span>
          <input name="bonuses" type="number" step="0.01" className="w-24 rounded border border-neutral-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Notas de deducción</span>
          <input name="deductionsNotes" className="w-48 rounded border border-neutral-300 px-3 py-2" />
        </label>
        <button type="submit" disabled={pending} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
          {pending ? 'Guardando…' : 'Capturar'}
        </button>
        {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      </form>
      <p className="text-xs text-neutral-400">Nunca calcula un monto de nómina — solo captura insumos (UC-HR-03).</p>
    </div>
  );
}
