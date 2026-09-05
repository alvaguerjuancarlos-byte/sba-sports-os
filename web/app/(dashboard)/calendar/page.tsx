import Link from 'next/link';
import { api } from '@/lib/api';
import { exigirSesion } from '@/lib/session';
import type { CalendarEvent, Venue } from '@/lib/types/calendar-rsvp';
import type { Team } from '@/lib/types/sports-hub';
import type { UsuarioDeOrganizacion } from '@/lib/types/identity';
import { EventCard } from './event-card';

export default async function CalendarPage() {
  const sesion = await exigirSesion();
  const esStaff = sesion.roles.includes('admin') || sesion.roles.includes('director');

  const [eventos, venues, equipos, usuarios] = await Promise.all([
    api.get<CalendarEvent[]>('/calendar-rsvp/calendar'),
    api.get<Venue[]>('/calendar-rsvp/venues'),
    api.get<Team[]>('/sports-hub/teams'),
    // /identity/users expone datos personales de toda la organización (email, teléfono, fecha de
    // nacimiento) — restringido a admin/director en el backend. Para un tutor, se omite: el nombre
    // de su propio hijo no se resuelve aquí, se cae al fallback del EventCard.
    esStaff ? api.get<UsuarioDeOrganizacion[]>('/identity/users') : Promise.resolve([] as UsuarioDeOrganizacion[]),
  ]);
  const nombrePorVenue = new Map(venues.map((v) => [v.id, v.name]));
  const nombrePorEquipo = new Map(equipos.map((t) => [t.id, t.name]));
  const nombrePorUsuario = new Map(usuarios.map((u) => [u.user_id, u.full_name]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900">Calendario (UC-CAL-04)</h2>
        <Link href="/calendar/events/new" className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white">
          Programar evento
        </Link>
      </div>
      <ul className="flex flex-col gap-3">
        {eventos.map((e) => (
          <EventCard
            key={e.id}
            evento={e}
            nombreVenue={nombrePorVenue.get(e.venue_id) ?? '—'}
            nombreEquipo={e.team_id ? (nombrePorEquipo.get(e.team_id) ?? '—') : 'Multi-equipo'}
            nombrePorHijo={nombrePorUsuario}
          />
        ))}
      </ul>
      {eventos.length === 0 && <p className="text-sm text-neutral-500">Sin eventos todavía.</p>}
    </div>
  );
}
