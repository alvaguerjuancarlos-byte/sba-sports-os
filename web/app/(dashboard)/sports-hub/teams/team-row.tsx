'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { archivarTeamAction } from './actions';
import type { Team } from '@/lib/types/sports-hub';

export function TeamRow({ team, nombreTemporada }: { team: Team; nombreTemporada: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b border-neutral-100">
      <td className="py-2 pr-4">
        <Link href={`/sports-hub/teams/${team.id}`} className="text-neutral-900 underline">
          {team.name}
        </Link>
      </td>
      <td className="py-2 pr-4 text-neutral-500">{nombreTemporada}</td>
      <td className="py-2 pr-4">{team.category}</td>
      <td className="py-2 pr-4">{team.sport}</td>
      <td className="py-2 pr-4">
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${team.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-neutral-200 text-neutral-600'}`}>
          {team.status}
        </span>
      </td>
      <td className="py-2 text-right">
        {team.status === 'active' && (
          <button type="button" disabled={pending} onClick={() => startTransition(async () => archivarTeamAction(team.id))} className="text-xs text-red-600 underline">
            Archivar
          </button>
        )}
      </td>
    </tr>
  );
}
