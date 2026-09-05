'use client';

import { useTransition } from 'react';
import { archivarBudgetLineAction } from './actions';
import type { BudgetLine } from '@/lib/types/admin-hub';

export function BudgetLineRow({ budgetLine, nombreDimension }: { budgetLine: BudgetLine; nombreDimension: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b border-neutral-100">
      <td className="py-2 pr-4">{nombreDimension}</td>
      <td className="py-2 pr-4 text-neutral-500">
        {budgetLine.season} / {budgetLine.period}
      </td>
      <td className="py-2 pr-4">${budgetLine.amount_budgeted}</td>
      <td className="py-2 pr-4">
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${budgetLine.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-neutral-200 text-neutral-600'}`}>
          {budgetLine.status}
        </span>
      </td>
      <td className="py-2 text-right">
        {budgetLine.status === 'active' && (
          <button type="button" disabled={pending} onClick={() => startTransition(async () => archivarBudgetLineAction(budgetLine.id))} className="text-xs text-red-600 underline">
            Archivar
          </button>
        )}
      </td>
    </tr>
  );
}
