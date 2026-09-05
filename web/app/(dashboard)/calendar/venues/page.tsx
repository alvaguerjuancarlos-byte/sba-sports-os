import { api } from '@/lib/api';
import type { Venue } from '@/lib/types/calendar-rsvp';
import { NewVenueForm } from './new-venue-form';
import { VenueRow } from './venue-row';

export default async function VenuesPage() {
  const venues = await api.get<Venue[]>('/calendar-rsvp/venues');

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-neutral-900">Sedes</h2>
      <NewVenueForm />
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4">Nombre</th>
            <th className="py-2 pr-4">Estado</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {venues.map((v) => (
            <VenueRow key={v.id} venue={v} />
          ))}
        </tbody>
      </table>
      {venues.length === 0 && <p className="text-sm text-neutral-500">Sin sedes todavía.</p>}
    </div>
  );
}
