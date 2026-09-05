import { api } from '@/lib/api';
import type { Invoice, Transaction } from '@/lib/types/payments-billing';
import { NewTransactionForm } from './new-transaction-form';
import { TransactionRow } from './transaction-row';

export default async function TransactionsPage() {
  const [transacciones, invoices] = await Promise.all([
    api.get<Transaction[]>('/payments/transactions'),
    api.get<Invoice[]>('/payments/invoices'),
  ]);
  const facturasPendientes = invoices.filter((i) => i.effective_status !== 'paid');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Pagos y reconciliación (UC-PAY-03)</h2>
        <p className="text-sm text-neutral-500">Ningún campo aquí contiene número de tarjeta o CVV — solo el ID de transacción del proveedor.</p>
      </div>
      <NewTransactionForm facturasPendientes={facturasPendientes} />
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4">ID del proveedor</th>
            <th className="py-2 pr-4">Monto</th>
            <th className="py-2 pr-4">Estado</th>
            <th className="py-2 pr-4">Reconciliación</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {transacciones.map((t) => (
            <TransactionRow key={t.id} transaction={t} />
          ))}
        </tbody>
      </table>
      {transacciones.length === 0 && <p className="text-sm text-neutral-500">Sin pagos registrados todavía.</p>}
    </div>
  );
}
