import { api } from '@/lib/api';
import type { BudgetVsActualRow } from '@/lib/types/admin-hub';
import type { FinancialDimension } from '@/lib/types/configuration-studio';

export default async function BudgetReportPage() {
  const [filas, dimensiones] = await Promise.all([
    api.get<BudgetVsActualRow[]>('/admin-hub/budget-vs-actual'),
    api.get<FinancialDimension[]>('/config/financial-dimensions'),
  ]);
  const nombrePorDimension = new Map(dimensiones.map((d) => [d.id, d.name]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Presupuesto vs. real (UC-ADM-07)</h2>
        <p className="text-sm text-neutral-500">Solo lectura — comprometido viene de órdenes de compra abiertas, gastado real de postings ya registrados.</p>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4">Dimensión</th>
            <th className="py-2 pr-4">Temporada / periodo</th>
            <th className="py-2 pr-4">Presupuestado</th>
            <th className="py-2 pr-4">Comprometido</th>
            <th className="py-2 pr-4">Gastado real</th>
            <th className="py-2 pr-4">Disponible</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => {
            const disponible = Number(f.amount_budgeted) - Number(f.comprometido) - Number(f.gastado_real);
            return (
              <tr key={f.budget_line_id} className="border-b border-neutral-100">
                <td className="py-2 pr-4">{nombrePorDimension.get(f.financial_dimension_id) ?? '—'}</td>
                <td className="py-2 pr-4 text-neutral-500">
                  {f.season} / {f.period}
                </td>
                <td className="py-2 pr-4">${f.amount_budgeted}</td>
                <td className="py-2 pr-4">${f.comprometido}</td>
                <td className="py-2 pr-4">${f.gastado_real}</td>
                <td className={`py-2 pr-4 font-medium ${disponible < 0 ? 'text-red-600' : 'text-neutral-900'}`}>${disponible.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {filas.length === 0 && <p className="text-sm text-neutral-500">Sin budget lines todavía.</p>}
    </div>
  );
}
