'use client';

import { useTransition } from 'react';
import { reconciliarAction } from './actions';
import type { Transaction } from '@/lib/types/payments-billing';

export function TransactionRow({ transaction }: { transaction: Transaction }) {
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b border-neutral-100">
      <td className="py-2 pr-4">{transaction.provider_txn_id}</td>
      <td className="py-2 pr-4">${transaction.amount}</td>
      <td className="py-2 pr-4">
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${transaction.status === 'processed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {transaction.status}
        </span>
      </td>
      <td className="py-2 pr-4">
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${transaction.reconciliation_status === 'ok' ? 'bg-neutral-100 text-neutral-600' : 'bg-amber-100 text-amber-800'}`}>
          {transaction.reconciliation_status}
        </span>
      </td>
      <td className="py-2 text-right">
        {transaction.reconciliation_status === 'ok' && (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(async () => reconciliarAction(transaction.id, 'processed'))}
              className="text-xs text-neutral-500 underline"
            >
              Confirmar
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(async () => reconciliarAction(transaction.id, transaction.status === 'processed' ? 'failed' : 'processed'))}
              className="text-xs text-amber-700 underline"
            >
              Reportar discrepancia
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
