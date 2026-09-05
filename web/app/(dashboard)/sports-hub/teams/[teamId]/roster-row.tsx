'use client';

import { useTransition } from 'react';
import { desactivarRosterMembershipAction } from './actions';
import type { RosterMembership } from '@/lib/types/sports-hub';

export function RosterRow({ teamId, membership, nombrePersona }: { teamId: string; membership: RosterMembership; nombrePersona: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b border-neutral-100">
      <td className="py-2 pr-4">{nombrePersona}</td>
      <td className="py-2 pr-4">{membership.role}</td>
      <td className="py-2 pr-4 text-neutral-500">
        {membership.jersey_number ?? '—'} {membership.position ? `· ${membership.position}` : ''}
      </td>
      <td className="py-2 pr-4">
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${membership.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-neutral-200 text-neutral-600'}`}>
          {membership.status}
        </span>
      </td>
      <td className="py-2 text-right">
        {membership.status === 'active' && (
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(async () => desactivarRosterMembershipAction(teamId, membership.id))}
            className="text-xs text-red-600 underline"
          >
            Dar de baja
          </button>
        )}
      </td>
    </tr>
  );
}
