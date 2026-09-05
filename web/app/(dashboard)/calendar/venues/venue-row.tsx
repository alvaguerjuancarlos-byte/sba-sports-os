'use client';

import { useTransition } from 'react';
import { archivarVenueAction } from './actions';
import type { Venue } from '@/lib/types/calendar-rsvp';

export function VenueRow({ venue }: { venue: Venue }) {
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b border-neutral-100">
      <td className="py-2 pr-4">{venue.name}</td>
      <td className="py-2 pr-4">
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${venue.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-neutral-200 text-neutral-600'}`}>
          {venue.status}
        </span>
      </td>
      <td className="py-2 text-right">
        {venue.status === 'active' && (
          <button type="button" disabled={pending} onClick={() => startTransition(async () => archivarVenueAction(venue.id))} className="text-xs text-red-600 underline">
            Archivar
          </button>
        )}
      </td>
    </tr>
  );
}
