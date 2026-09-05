import { api } from '@/lib/api';
import type { FinancialDimension } from '@/lib/types/configuration-studio';
import { NewDimensionForm } from './new-dimension-form';
import { DimensionRow } from './dimension-row';

export default async function FinancialDimensionsPage() {
  const dimensiones = await api.get<FinancialDimension[]>('/config/financial-dimensions');
  const activas = dimensiones.filter((d) => d.status === 'active');
  const porId = new Map(dimensiones.map((d) => [d.id, d.name]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Dimensiones financieras (UC-CFG-01)</h2>
        <p className="text-sm text-neutral-500">Clasificación jerárquica (class → group → budget_line → concept) que usa Admin Hub para presupuestos.</p>
      </div>
      <NewDimensionForm dimensionesActivas={activas} />
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4">Nombre</th>
            <th className="py-2 pr-4">Tipo</th>
            <th className="py-2 pr-4">Padre</th>
            <th className="py-2 pr-4">Elegibilidad (UC-PAY-05)</th>
            <th className="py-2 pr-4">Estado</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {dimensiones.map((d) => (
            <DimensionRow key={d.id} dimension={d} nombrePadre={d.parent_id ? (porId.get(d.parent_id) ?? null) : null} />
          ))}
        </tbody>
      </table>
      {dimensiones.length === 0 && <p className="text-sm text-neutral-500">Sin dimensiones todavía.</p>}
    </div>
  );
}
