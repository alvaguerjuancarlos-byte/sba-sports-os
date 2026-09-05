import { api } from '@/lib/api';
import { exigirSesion } from '@/lib/session';
import type { Venue } from '@/lib/types/calendar-rsvp';
import type { LeagueCup, Team } from '@/lib/types/sports-hub';
import { NewEventForm } from './new-event-form';

export default async function NewEventPage() {
  const [sesion, equipos, ligas, venues] = await Promise.all([
    exigirSesion(),
    api.get<Team[]>('/sports-hub/teams'),
    api.get<LeagueCup[]>('/sports-hub/league-cups'),
    api.get<Venue[]>('/calendar-rsvp/venues'),
  ]);
  const equiposActivos = equipos.filter((t) => t.status === 'active');
  const venuesActivos = venues.filter((v) => v.status === 'active');
  const puedeForzarTraslape = sesion.roles.includes('admin') || sesion.roles.includes('director');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Programar evento (UC-CAL-01/02)</h2>
        <p className="text-sm text-neutral-500">Crear el evento genera automáticamente el RSVP para todo el roster activo del equipo.</p>
      </div>
      <NewEventForm equiposActivos={equiposActivos} ligas={ligas} venuesActivos={venuesActivos} puedeForzarTraslape={puedeForzarTraslape} />
    </div>
  );
}
