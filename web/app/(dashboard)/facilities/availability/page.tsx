import { api } from '@/lib/api';
import type { DisponibilidadItem } from '@/lib/types/facilities-inventory';
import type { Venue } from '@/lib/types/calendar-rsvp';

export default async function AvailabilityPage({ searchParams }: { searchParams: Promise<{ venueId?: string }> }) {
  const venues = await api.get<Venue[]>('/calendar-rsvp/venues');
  const venuesActivos = venues.filter((v) => v.status === 'active');
  const { venueId: venueIdParam } = await searchParams;
  const venueId = venueIdParam || venuesActivos[0]?.id;

  const disponibilidad = venueId ? await api.get<DisponibilidadItem[]>(`/facilities-inventory/venues/${venueId}/availability`) : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Disponibilidad (UC-FAC-03)</h2>
        <p className="text-sm text-neutral-500">Siempre resta los check-outs abiertos, nunca solo el total físico registrado.</p>
      </div>

      <form method="get" className="flex items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Sede</span>
          <select name="venueId" defaultValue={venueId ?? ''} className="w-48 rounded border border-neutral-300 px-3 py-2">
            {venuesActivos.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded border border-neutral-300 px-3 py-2 text-sm font-medium">
          Consultar
        </button>
      </form>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4">Material</th>
            <th className="py-2 pr-4">Categoría</th>
            <th className="py-2 pr-4">Total</th>
            <th className="py-2 pr-4">Disponible</th>
          </tr>
        </thead>
        <tbody>
          {disponibilidad.map((i) => (
            <tr key={i.id} className="border-b border-neutral-100">
              <td className="py-2 pr-4">{i.name}</td>
              <td className="py-2 pr-4 text-neutral-500">{i.category}</td>
              <td className="py-2 pr-4">{i.quantity_total}</td>
              <td className={`py-2 pr-4 font-medium ${i.disponible === 0 ? 'text-red-600' : 'text-neutral-900'}`}>{i.disponible}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {disponibilidad.length === 0 && <p className="text-sm text-neutral-500">Sin material activo en esta sede.</p>}
    </div>
  );
}
