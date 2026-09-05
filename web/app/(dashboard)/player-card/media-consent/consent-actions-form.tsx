'use client';

import { useActionState } from 'react';
import { otorgarMediaConsentAction, revocarMediaConsentAction } from './actions';
import type { AccionState } from './actions';
import type { MediaConsent } from '@/lib/types/player-card';

const ESTADO_INICIAL: AccionState = { error: null };

export function ConsentActionsForm({ userId, consent }: { userId: string; consent: MediaConsent | null }) {
  const [grantState, grantAction, grantPending] = useActionState(otorgarMediaConsentAction, ESTADO_INICIAL);
  const [revokeState, revokeAction, revokePending] = useActionState(revocarMediaConsentAction, ESTADO_INICIAL);
  const otorgado = consent?.consent_status === 'granted';

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-700">
        Estado actual:{' '}
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${otorgado ? 'bg-green-100 text-green-800' : 'bg-neutral-200 text-neutral-600'}`}>
          {consent?.consent_status ?? 'sin registro'}
        </span>
      </p>
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
    </div>
  );
}
