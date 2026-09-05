import { api } from '@/lib/api';
import type { InventoryItem } from '@/lib/types/facilities-inventory';
import type { Venue } from '@/lib/types/calendar-rsvp';
import { NewItemForm } from './new-item-form';
import { ItemRow } from './item-row';

export default async function InventoryItemsPage() {
  const [items, venues] = await Promise.all([
    api.get<InventoryItem[]>('/facilities-inventory/items'),
    api.get<Venue[]>('/calendar-rsvp/venues'),
  ]);
  const venuesActivos = venues.filter((v) => v.status === 'active');
  const nombrePorVenue = new Map(venues.map((v) => [v.id, v.name]));

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-neutral-900">Material de inventario (UC-FAC-01)</h2>
      <NewItemForm venuesActivos={venuesActivos} />
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4">Nombre</th>
            <th className="py-2 pr-4">Sede</th>
            <th className="py-2 pr-4">Categoría</th>
            <th className="py-2 pr-4">Cantidad total</th>
            <th className="py-2 pr-4">Estado</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <ItemRow key={i.id} item={i} nombreVenue={nombrePorVenue.get(i.venue_id) ?? '—'} />
          ))}
        </tbody>
      </table>
      {items.length === 0 && <p className="text-sm text-neutral-500">Sin material todavía.</p>}
    </div>
  );
}
