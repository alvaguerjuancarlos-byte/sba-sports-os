import { api } from '@/lib/api';
import type { BudgetLine } from '@/lib/types/admin-hub';
import type { FinancialDimension } from '@/lib/types/configuration-studio';
import { NewBudgetLineForm } from './new-budget-line-form';
import { BudgetLineRow } from './budget-line-row';

export default async function BudgetLinesPage() {
  const [budgetLines, dimensiones] = await Promise.all([
    api.get<BudgetLine[]>('/admin-hub/budget-lines'),
    api.get<FinancialDimension[]>('/config/financial-dimensions'),
  ]);
  const dimensionesActivas = dimensiones.filter((d) => d.status === 'active');
  const nombrePorDimension = new Map(dimensiones.map((d) => [d.id, d.name]));

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-neutral-900">Budget lines (UC-ADM-01)</h2>
      <NewBudgetLineForm dimensionesActivas={dimensionesActivas} />
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4">Dimensión</th>
            <th className="py-2 pr-4">Temporada / periodo</th>
            <th className="py-2 pr-4">Presupuesto</th>
            <th className="py-2 pr-4">Estado</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {budgetLines.map((b) => (
            <BudgetLineRow key={b.id} budgetLine={b} nombreDimension={nombrePorDimension.get(b.financial_dimension_id) ?? '—'} />
          ))}
        </tbody>
      </table>
      {budgetLines.length === 0 && <p className="text-sm text-neutral-500">Sin budget lines todavía.</p>}
    </div>
  );
}
