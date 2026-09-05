'use client';

import { useTransition, useActionState } from 'react';
import { responderConvocatoriaAction, crearWaiverAction } from './actions';
import type { AccionState } from './actions';
import type { CallupSlot } from '@/lib/types/callup-engine';

const ESTILO_STATUS: Record<CallupSlot['status'], string> = {
  called: 'bg-blue-100 text-blue-800',
  alternate: 'bg-neutral-200 text-neutral-600',
  accepted: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
  excluded: 'bg-amber-100 text-amber-800',
};

const ESTADO_INICIAL: AccionState = { error: null };

export function SlotRow({
  eventId,
  callupListId,
  slot,
  nombrePersona,
  puedeResponder,
  puedeAplicarWaiver,
}: {
  eventId: string;
  callupListId: string;
  slot: CallupSlot;
  nombrePersona: string;
  puedeResponder: boolean;
  puedeAplicarWaiver: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const accionWaiver = crearWaiverAction.bind(null, eventId, callupListId);
  const [waiverState, waiverAction, waiverPending] = useActionState(accionWaiver, ESTADO_INICIAL);

  return (
    <tr className="border-b border-neutral-100 align-top">
      <td className="py-2 pr-4">{nombrePersona}</td>
      <td className="py-2 pr-4">
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${ESTILO_STATUS[slot.status]}`}>{slot.status}</span>
      </td>
      <td className="py-2 pr-4 text-neutral-500">{slot.priority_score ?? '—'}</td>
      <td className="py-2 pr-4">
        {slot.waivers.map((w) => (
          <p key={w.id} className="text-xs text-amber-700">
            {w.action === 'exclude' ? 'Excluido' : 'Incluido'} por waiver{w.internal_comment ? `: ${w.internal_comment}` : ''}
          </p>
        ))}
      </td>
      <td className="py-2 text-right">
        <div className="flex flex-col items-end gap-2">
          {puedeResponder && slot.status === 'called' && (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(async () => responderConvocatoriaAction(eventId, slot.id, 'accepted'))}
                className="text-xs text-green-700 underline"
              >
                Aceptar
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(async () => responderConvocatoriaAction(eventId, slot.id, 'declined'))}
                className="text-xs text-red-600 underline"
              >
                Declinar
              </button>
            </div>
          )}
          {puedeAplicarWaiver && (
            <form action={waiverAction} className="flex flex-col items-end gap-1">
              <input type="hidden" name="userId" value={slot.user_id} />
              <div className="flex items-center gap-1">
                <select name="action" defaultValue="exclude" className="rounded border border-neutral-300 px-1 py-1 text-xs">
                  <option value="exclude">Excluir</option>
                  <option value="include">Incluir</option>
                </select>
                <input name="internalComment" required placeholder="Motivo (interno)" className="w-32 rounded border border-neutral-300 px-2 py-1 text-xs" />
                <button type="submit" disabled={waiverPending} className="text-xs text-neutral-700 underline">
                  Aplicar waiver
                </button>
              </div>
              {waiverState.error && <p className="text-xs text-red-600">{waiverState.error}</p>}
            </form>
          )}
        </div>
      </td>
    </tr>
  );
}
