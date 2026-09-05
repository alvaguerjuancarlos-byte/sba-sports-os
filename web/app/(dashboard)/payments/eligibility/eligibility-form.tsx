'use client';

import { useActionState } from 'react';
import { consultarElegibilidadAction } from './actions';
import type { EligibilidadState } from './actions';
import type { UsuarioDeOrganizacion } from '@/lib/types/identity';

const ESTADO_INICIAL: EligibilidadState = { resultado: null, error: null };

export function EligibilityForm({ atletas }: { atletas: UsuarioDeOrganizacion[] }) {
  const [state, formAction, pending] = useActionState(consultarElegibilidadAction, ESTADO_INICIAL);

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Atleta</span>
          <select name="athleteUserId" required defaultValue="" className="w-48 rounded border border-neutral-300 px-3 py-2">
            <option value="" disabled>
              — elegir —
            </option>
            {atletas.map((a) => (
              <option key={a.user_id} value={a.user_id}>
                {a.full_name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={pending} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
          {pending ? 'Consultando…' : 'Consultar'}
        </button>
      </form>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.resultado && (
        <div className={`rounded border px-4 py-3 text-sm ${state.resultado.eligible ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
          {state.resultado.eligible ? (
            <p>Elegible — sin saldo vencido cualificante.</p>
          ) : (
            <p>
              Bloqueado por saldo vencido (factura {state.resultado.blockingInvoiceId}).{' '}
              {state.resultado.paymentLink && <span className="text-neutral-500">Link de pago: {state.resultado.paymentLink}</span>}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
