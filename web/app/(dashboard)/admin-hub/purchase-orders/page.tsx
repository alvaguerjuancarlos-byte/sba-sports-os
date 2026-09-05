import { api } from '@/lib/api';
import type { PurchaseOrder, PurchaseRequest, Vendor } from '@/lib/types/admin-hub';
import { NewPurchaseOrderForm } from './new-purchase-order-form';

export default async function PurchaseOrdersPage() {
  const [ordenes, solicitudes, vendores] = await Promise.all([
    api.get<PurchaseOrder[]>('/admin-hub/purchase-orders'),
    api.get<PurchaseRequest[]>('/admin-hub/purchase-requests'),
    api.get<Vendor[]>('/admin-hub/vendors'),
  ]);
  const ordenadasPorSolicitud = new Set(ordenes.map((o) => o.purchase_request_id));
  const solicitudesDisponibles = solicitudes.filter((s) => s.status === 'approved' && !ordenadasPorSolicitud.has(s.id));
  const vendoresActivos = vendores.filter((v) => v.status === 'active');
  const nombrePorVendor = new Map(vendores.map((v) => [v.id, v.name]));

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-neutral-900">Órdenes de compra (UC-ADM-04)</h2>
      <NewPurchaseOrderForm solicitudesDisponibles={solicitudesDisponibles} vendoresActivos={vendoresActivos} />
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4">Proveedor</th>
            <th className="py-2 pr-4">Monto</th>
            <th className="py-2 pr-4">Emitida</th>
          </tr>
        </thead>
        <tbody>
          {ordenes.map((o) => (
            <tr key={o.id} className="border-b border-neutral-100">
              <td className="py-2 pr-4">{nombrePorVendor.get(o.vendor_id) ?? '—'}</td>
              <td className="py-2 pr-4">${o.amount}</td>
              <td className="py-2 pr-4 text-neutral-500">{new Date(o.created_at).toLocaleDateString('es-MX')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {ordenes.length === 0 && <p className="text-sm text-neutral-500">Sin órdenes de compra todavía.</p>}
    </div>
  );
}
