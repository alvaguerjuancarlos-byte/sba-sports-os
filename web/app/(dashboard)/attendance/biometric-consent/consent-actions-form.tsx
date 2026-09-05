'use client';

import { useActionState } from 'react';
import { otorgarConsentimientoAction, revocarConsentimientoAction, registrarTemplateAction } from './actions';
import type { AccionState } from './actions';
import type { BiometricConsent } from '@/lib/types/attendance-realtime';

const ESTADO_INICIAL: AccionState = { error: null };

export function ConsentActionsForm({ userId, consent }: { userId: string; consent: BiometricConsent | null }) {
  const [grantState, grantAction, grantPending] = useActionState(otorgarConsentimientoAction, ESTADO_INICIAL);
  const [revokeState, revokeAction, revokePending] = useActionState(revocarConsentimientoAction, ESTADO_INICIAL);
  const [templateState, templateAction, templatePending] = useActionState(registrarTemplateAction, ESTADO_INICIAL);

  const otorgado = consent?.consent_status === 'granted';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-neutral-700">
          Estado actual:{' '}
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${otorgado ? 'bg-green-100 text-green-800' : 'bg-neutral-200 text-neutral-600'}`}>
            {consent?.consent_status ?? 'sin registro'}
          </span>
        </span>
      </div>

      <div className="flex gap-4">
        <form action={grantAction}>
          <input type="hidden" name="userId" value={userId} />
          <button type="submit" disabled={grantPending || otorgado} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
            Otorgar consentimiento
          </button>
        </form>
        <form action={revokeAction}>
          <input type="hidden" name="userId" value={userId} />
          <button type="submit" disabled={revokePending || !otorgado} className="rounded border border-red-300 px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-50">
            Revocar
          </button>
        </form>
      </div>
      {grantState.error && <p className="text-sm text-red-600">{grantState.error}</p>}
      {revokeState.error && <p className="text-sm text-red-600">{revokeState.error}</p>}

      {otorgado && (
        <form action={templateAction} className="flex flex-wrap items-end gap-2 border-t border-neutral-200 pt-4">
          <input type="hidden" name="userId" value={userId} />
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">Referencia del proveedor biométrico</span>
            <input name="providerRef" required placeholder="prov-ref-123" className="w-56 rounded border border-neutral-300 px-3 py-2" />
          </label>
          <button type="submit" disabled={templatePending} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
            {templatePending ? 'Registrando…' : 'Registrar template'}
          </button>
          {templateState.error && <p className="w-full text-sm text-red-600">{templateState.error}</p>}
        </form>
      )}
    </div>
  );
}
