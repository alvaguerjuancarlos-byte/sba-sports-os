import { api } from '@/lib/api';
import type { ActualPosting, PurchaseOrder } from '@/lib/types/admin-hub';
import { NewActualPostingForm } from './new-actual-posting-form';

export default async function ActualPostingsPage() {
  const [postings, ordenes] = await Promise.all([
    api.get<ActualPosting[]>('/admin-hub/actual-postings'),
    api.get<PurchaseOrder[]>('/admin-hub/purchase-orders'),
  ]);
  const postedPorOrden = new Set(postings.map((p) => p.purchase_order_id));
  const ordenesDisponibles = ordenes.filter((o) => !postedPorOrden.has(o.id));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Gasto real (UC-ADM-05)</h2>
        <p className="text-sm text-neutral-500">Registrar el gasto real libera/consume el commitment de la orden de compra — nunca coexisten duplicados para el mismo gasto.</p>
      </div>
      <NewActualPostingForm ordenesDisponibles={ordenesDisponibles} />
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4">Monto</th>
            <th className="py-2 pr-4">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {postings.map((p) => (
            <tr key={p.id} className="border-b border-neutral-100">
              <td className="py-2 pr-4">${p.amount}</td>
              <td className="py-2 pr-4 text-neutral-500">{new Date(p.posted_at).toLocaleDateString('es-MX')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {postings.length === 0 && <p className="text-sm text-neutral-500">Sin gasto real registrado todavía.</p>}
    </div>
  );
}
