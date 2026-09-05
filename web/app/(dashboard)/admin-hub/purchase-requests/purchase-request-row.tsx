'use client';

import { useTransition, useActionState } from 'react';
import { aprobarPurchaseRequestAction, rechazarPurchaseRequestAction } from './actions';
import type { AccionState } from './actions';
import type { PurchaseRequest } from '@/lib/types/admin-hub';

const ESTADO_INICIAL: AccionState = { error: null };

const ESTILO_STATUS: Record<PurchaseRequest['status'], string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export function PurchaseRequestRow({ solicitud, puedeAprobar }: { solicitud: PurchaseRequest; puedeAprobar: boolean }) {
  const [aprobando, startAprobar] = useTransition();
  const [state, rechazarAction, rechazando] = useActionState(rechazarPurchaseRequestAction, ESTADO_INICIAL);

  return (
    <tr className="border-b border-neutral-100 align-top">
      <td className="py-2 pr-4">${solicitud.amount}</td>
      <td className="py-2 pr-4 text-neutral-500">{solicitud.justification ?? '—'}</td>
      <td className="py-2 pr-4">{solicitud.routing === 'exception' ? 'Excepción' : 'Dentro de presupuesto'}</td>
      <td className="py-2 pr-4">
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${ESTILO_STATUS[solicitud.status]}`}>{solicitud.status}</span>
        {solicitud.status === 'rejected' && solicitud.rejection_reason && (
          <p className="mt-1 text-xs text-neutral-500">{solicitud.rejection_reason}</p>
        )}
      </td>
      <td className="py-2 text-right">
        {solicitud.status === 'pending' && puedeAprobar && (
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              disabled={aprobando}
              onClick={() => startAprobar(async () => aprobarPurchaseRequestAction(solicitud.id))}
              className="text-xs text-green-700 underline"
            >
              Aprobar
            </button>
            <form action={rechazarAction} className="flex items-center gap-1">
              <input type="hidden" name="purchaseRequestId" value={solicitud.id} />
              <input name="rejectionReason" required placeholder="Motivo de rechazo" className="w-40 rounded border border-neutral-300 px-2 py-1 text-xs" />
              <button type="submit" disabled={rechazando} className="text-xs text-red-600 underline">
                Rechazar
              </button>
            </form>
            {state.error && <p className="text-xs text-red-600">{state.error}</p>}
          </div>
        )}
      </td>
    </tr>
  );
}
