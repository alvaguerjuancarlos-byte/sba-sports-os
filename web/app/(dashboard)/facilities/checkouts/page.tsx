import { api } from '@/lib/api';
import { listarDirectorio } from '@/lib/identity';
import type { InventoryCheckout, InventoryItem } from '@/lib/types/facilities-inventory';
import { NewCheckoutForm } from './new-checkout-form';
import { CheckoutRow } from './checkout-row';

export default async function CheckoutsPage() {
  const [pendientes, items, usuarios] = await Promise.all([
    api.get<InventoryCheckout[]>('/facilities-inventory/checkouts/pending-return'),
    api.get<InventoryItem[]>('/facilities-inventory/items'),
    listarDirectorio(),
  ]);
  const itemsActivos = items.filter((i) => i.status === 'active');
  const nombrePorItem = new Map(items.map((i) => [i.id, i.name]));
  const nombrePorUsuario = new Map(usuarios.map((u) => [u.user_id, u.full_name]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Check-out de material (UC-FAC-02)</h2>
        <p className="text-sm text-neutral-500">Todo check-out sin devolución es visible aquí — nunca se pierde de vista silenciosamente.</p>
      </div>
      <NewCheckoutForm itemsActivos={itemsActivos} />
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4">Material</th>
            <th className="py-2 pr-4">Cantidad</th>
            <th className="py-2 pr-4">Retirado por</th>
            <th className="py-2 pr-4">Fecha</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {pendientes.map((c) => (
            <CheckoutRow
              key={c.id}
              checkout={c}
              nombreItem={nombrePorItem.get(c.inventory_item_id) ?? '—'}
              nombreCheckedOutBy={nombrePorUsuario.get(c.checked_out_by) ?? '—'}
            />
          ))}
        </tbody>
      </table>
      {pendientes.length === 0 && <p className="text-sm text-neutral-500">Sin material pendiente de devolución.</p>}
    </div>
  );
}
