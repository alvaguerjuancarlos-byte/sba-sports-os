'use client';

import { useTransition, useActionState } from 'react';
import { cancelarMembershipPlanAction, aplicarBecaAction } from './actions';
import type { AccionState } from './actions';
import type { MembershipPlan } from '@/lib/types/payments-billing';

const ESTADO_INICIAL: AccionState = { error: null };

export function MembershipPlanRow({ plan, nombreAtleta, esDirector }: { plan: MembershipPlan; nombreAtleta: string; esDirector: boolean }) {
  const [cancelando, startCancelar] = useTransition();
  const [state, becaAction, aplicandoBeca] = useActionState(aplicarBecaAction, ESTADO_INICIAL);
  const tieneScopeDeBeca = plan.scholarship_flag !== undefined;

  return (
    <tr className="border-b border-neutral-100 align-top">
      <td className="py-2 pr-4">{nombreAtleta}</td>
      <td className="py-2 pr-4">{plan.name}</td>
      <td className="py-2 pr-4">
        ${plan.amount} {plan.currency} / {plan.billing_cycle === 'monthly' ? 'mes' : 'único'}
      </td>
      <td className="py-2 pr-4">
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${plan.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-neutral-200 text-neutral-600'}`}>
          {plan.status}
        </span>
      </td>
      <td className="py-2 pr-4">
        {tieneScopeDeBeca ? (
          plan.scholarship_flag ? (
            <span className="text-xs text-amber-700">
              Beca: {plan.scholarship_amount ? `$${plan.scholarship_amount}` : `${plan.scholarship_pct}%`}
            </span>
          ) : esDirector && plan.status === 'active' ? (
            <form action={becaAction} className="flex items-center gap-1">
              <input type="hidden" name="membershipPlanId" value={plan.id} />
              <input name="scholarshipPct" placeholder="% beca" className="w-16 rounded border border-neutral-300 px-2 py-1 text-xs" />
              <button type="submit" disabled={aplicandoBeca} className="text-xs text-amber-700 underline">
                Aplicar
              </button>
            </form>
          ) : (
            <span className="text-xs text-neutral-400">Sin beca</span>
          )
        ) : (
          <span className="text-xs text-neutral-400">Restringido</span>
        )}
        {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      </td>
      <td className="py-2 text-right">
        {plan.status === 'active' && (
          <button type="button" disabled={cancelando} onClick={() => startCancelar(async () => cancelarMembershipPlanAction(plan.id))} className="text-xs text-red-600 underline">
            Cancelar
          </button>
        )}
      </td>
    </tr>
  );
}
