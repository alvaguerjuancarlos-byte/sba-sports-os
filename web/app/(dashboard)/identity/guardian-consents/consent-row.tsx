'use client';

import { useState, useTransition } from 'react';
import { negarAction, otorgarAction } from './actions';

export function ConsentRow({ guardianLinkId, guardianUserId, athleteUserId }: { guardianLinkId: string; guardianUserId: string; athleteUserId: string }) {
  const [pending, startTransition] = useTransition();
  const [privacyNoticeVersion, setPrivacyNoticeVersion] = useState('v1');

  return (
    <li className="flex flex-col gap-2 rounded border border-neutral-200 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p>
          Tutor <span className="font-mono text-xs">{guardianUserId}</span>
        </p>
        <p className="text-neutral-500">
          Atleta <span className="font-mono text-xs">{athleteUserId}</span>
        </p>
      </div>
      <div className="flex items-center gap-2">
        <input
          value={privacyNoticeVersion}
          onChange={(e) => setPrivacyNoticeVersion(e.target.value)}
          className="w-16 rounded border border-neutral-300 px-2 py-1 text-xs"
          aria-label="Versión de aviso de privacidad"
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(async () => otorgarAction(guardianLinkId, privacyNoticeVersion))}
          className="rounded bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          Otorgar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(async () => negarAction(guardianLinkId))}
          className="rounded border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 disabled:opacity-50"
        >
          Negar
        </button>
      </div>
    </li>
  );
}
