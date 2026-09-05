import type { DevelopmentDimensions } from '@/lib/types/performance';

const ETIQUETAS: Record<keyof DevelopmentDimensions, string> = {
  desempeño: 'Desempeño',
  rendimientoEnPartido: 'Rendimiento en partido',
  actitudSemanal: 'Actitud semanal',
  asistencia: 'Asistencia',
};

export function DimensionsTable({ dimensions }: { dimensions: DevelopmentDimensions }) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-neutral-200 text-left text-neutral-500">
          <th className="py-2 pr-4">Dimensión</th>
          <th className="py-2 pr-4">Valor</th>
          <th className="py-2 pr-4">Excluidos</th>
        </tr>
      </thead>
      <tbody>
        {(Object.keys(ETIQUETAS) as (keyof DevelopmentDimensions)[]).map((clave) => {
          const d = dimensions[clave];
          return (
            <tr key={clave} className="border-b border-neutral-100">
              <td className="py-2 pr-4">{ETIQUETAS[clave]}</td>
              <td className="py-2 pr-4">
                {d.sufficientData && d.value != null ? d.value.toFixed(2) : <span className="text-xs text-amber-700">Datos insuficientes</span>}
              </td>
              <td className="py-2 pr-4 text-neutral-500">{d.excludedCount ?? '—'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
