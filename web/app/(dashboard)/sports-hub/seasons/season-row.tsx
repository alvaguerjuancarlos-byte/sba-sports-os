'use client';

import { useTransition } from 'react';
import { cerrarSeasonAction } from './actions';
import type { Season } from '@/lib/types/sports-hub';

export function SeasonRow({ season }: { season: Season }) {
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b border-neutral-100">
      <td className="py-2 pr-4">{season.name}</td>
      <td className="py-2 pr-4 text-neutral-500">
        {season.start_date} → {season.end_date}
      </td>
      <td className="py-2 pr-4">
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${season.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-neutral-200 text-neutral-600'}`}>
          {season.status}
        </span>
      </td>
      <td className="py-2 text-right">
        {season.status === 'active' && (
          <button type="button" disabled={pending} onClick={() => startTransition(async () => cerrarSeasonAction(season.id))} className="text-xs text-red-600 underline">
            Cerrar
          </button>
        )}
      </td>
    </tr>
  );
}
