import Link from 'next/link';
import { api } from '@/lib/api';
import type { CalendarEvent, Venue } from '@/lib/types/calendar-rsvp';
import type { Team } from '@/lib/types/sports-hub';

export default async function CheckinsIndexPage() {
  const [eventos, venues, equipos] = await Promise.all([
    api.get<CalendarEvent[]>('/calendar-rsvp/calendar'),
    api.get<Venue[]>('/calendar-rsvp/venues'),
    api.get<Team[]>('/sports-hub/teams'),
  ]);
  const nombrePorVenue = new Map(venues.map((v) => [v.id, v.name]));
  const nombrePorEquipo = new Map(equipos.map((t) => [t.id, t.name]));

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-neutral-900">Check-ins por evento</h2>
      <ul className="flex flex-col gap-2">
        {eventos.map((e) => (
          <li key={e.id}>
            <Link href={`/attendance/checkins/${e.id}`} className="block rounded border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50">
              <span className="font-medium">{e.team_id ? (nombrePorEquipo.get(e.team_id) ?? '—') : 'Multi-equipo'}</span>{' '}
              <span className="text-neutral-500">
                — {nombrePorVenue.get(e.venue_id) ?? '—'} · {new Date(e.start_at).toLocaleString('es-MX')}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {eventos.length === 0 && <p className="text-sm text-neutral-500">Sin eventos todavía.</p>}
    </div>
  );
}
