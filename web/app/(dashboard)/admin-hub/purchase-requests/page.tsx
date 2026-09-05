import { api } from '@/lib/api';
import { exigirSesion } from '@/lib/session';
import type { BudgetLine, PurchaseRequest } from '@/lib/types/admin-hub';
import { NewPurchaseRequestForm } from './new-purchase-request-form';
import { PurchaseRequestRow } from './purchase-request-row';

export default async function PurchaseRequestsPage() {
  const [sesion, solicitudes, budgetLines] = await Promise.all([
    exigirSesion(),
    api.get<PurchaseRequest[]>('/admin-hub/purchase-requests'),
    api.get<BudgetLine[]>('/admin-hub/budget-lines'),
  ]);
  const budgetLinesActivas = budgetLines.filter((b) => b.status === 'active');
  const puedeAprobar = sesion.roles.includes('admin') || sesion.roles.includes('director');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Solicitudes de compra (UC-ADM-02/03)</h2>
        <p className="text-sm text-neutral-500">Toda solicitud se valida contra el presupuesto aprobado — fuera de presupuesto se marca como excepción.</p>
      </div>
      <NewPurchaseRequestForm budgetLinesActivas={budgetLinesActivas} />
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4">Monto</th>
            <th className="py-2 pr-4">Justificación</th>
            <th className="py-2 pr-4">Ruteo</th>
            <th className="py-2 pr-4">Estado</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {solicitudes.map((s) => (
            <PurchaseRequestRow key={s.id} solicitud={s} puedeAprobar={puedeAprobar} />
          ))}
        </tbody>
      </table>
      {solicitudes.length === 0 && <p className="text-sm text-neutral-500">Sin solicitudes todavía.</p>}
    </div>
  );
}
