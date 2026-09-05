import { api } from '@/lib/api';
import type { Invoice, MembershipPlan } from '@/lib/types/payments-billing';
import type { UsuarioDeOrganizacion } from '@/lib/types/identity';
import type { ProductCatalogItem } from '@/lib/types/configuration-studio';
import { NewInvoiceForm } from './new-invoice-form';

const ESTILO_STATUS: Record<Invoice['effective_status'], string> = {
  pending: 'bg-amber-100 text-amber-800',
  overdue: 'bg-red-100 text-red-800',
  paid: 'bg-green-100 text-green-800',
};

export default async function InvoicesPage() {
  const [invoices, usuarios, planes, productos] = await Promise.all([
    api.get<Invoice[]>('/payments/invoices'),
    api.get<UsuarioDeOrganizacion[]>('/identity/users'),
    api.get<MembershipPlan[]>('/payments/membership-plans'),
    api.get<ProductCatalogItem[]>('/config/product-catalog'),
  ]);
  const atletas = usuarios.filter((u) => u.role === 'player' && u.status === 'active');
  const nombrePorAtleta = new Map(usuarios.map((u) => [u.user_id, u.full_name]));
  const planesActivos = planes.filter((p) => p.status === 'active');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Facturas (UC-PAY-02)</h2>
        <p className="text-sm text-neutral-500">&quot;overdue&quot; nunca se almacena — se calcula contra la fecha de vencimiento en cada consulta.</p>
      </div>
      <NewInvoiceForm atletas={atletas} planesActivos={planesActivos} productosActivos={productos} />
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4">Atleta</th>
            <th className="py-2 pr-4">Monto</th>
            <th className="py-2 pr-4">Vence</th>
            <th className="py-2 pr-4">Estado</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((i) => (
            <tr key={i.id} className="border-b border-neutral-100">
              <td className="py-2 pr-4">{nombrePorAtleta.get(i.athlete_user_id) ?? '—'}</td>
              <td className="py-2 pr-4">${i.amount_due}</td>
              <td className="py-2 pr-4 text-neutral-500">{i.due_date}</td>
              <td className="py-2 pr-4">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${ESTILO_STATUS[i.effective_status]}`}>{i.effective_status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {invoices.length === 0 && <p className="text-sm text-neutral-500">Sin facturas todavía.</p>}
    </div>
  );
}
