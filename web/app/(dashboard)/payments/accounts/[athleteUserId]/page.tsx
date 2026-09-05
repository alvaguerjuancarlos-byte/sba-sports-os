import { api, ApiError } from '@/lib/api';
import type { BalanceResult } from '@/lib/types/payments-billing';

export default async function AccountDetailPage({ params }: { params: Promise<{ athleteUserId: string }> }) {
  const { athleteUserId } = await params;

  let balance: BalanceResult;
  try {
    balance = await api.get<BalanceResult>(`/payments/balance/${athleteUserId}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) {
      return <p className="text-sm text-red-600">No tienes permiso para ver el saldo de esta cuenta.</p>;
    }
    throw e;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Saldo de la cuenta</h2>
        <p className="text-2xl font-semibold text-neutral-900">${balance.saldoActual.toFixed(2)}</p>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Facturas</h3>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="py-2 pr-4">Monto</th>
              <th className="py-2 pr-4">Vence</th>
              <th className="py-2 pr-4">Estado</th>
            </tr>
          </thead>
          <tbody>
            {balance.invoices.map((i) => (
              <tr key={i.id} className="border-b border-neutral-100">
                <td className="py-2 pr-4">${i.amount_due}</td>
                <td className="py-2 pr-4 text-neutral-500">{i.due_date}</td>
                <td className="py-2 pr-4">{i.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {balance.invoices.length === 0 && <p className="text-sm text-neutral-500">Sin facturas.</p>}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Pagos</h3>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="py-2 pr-4">ID del proveedor</th>
              <th className="py-2 pr-4">Monto</th>
              <th className="py-2 pr-4">Estado</th>
            </tr>
          </thead>
          <tbody>
            {balance.transactions.map((t) => (
              <tr key={t.id} className="border-b border-neutral-100">
                <td className="py-2 pr-4">{t.provider_txn_id}</td>
                <td className="py-2 pr-4">${t.amount}</td>
                <td className="py-2 pr-4">{t.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {balance.transactions.length === 0 && <p className="text-sm text-neutral-500">Sin pagos.</p>}
      </div>
    </div>
  );
}
