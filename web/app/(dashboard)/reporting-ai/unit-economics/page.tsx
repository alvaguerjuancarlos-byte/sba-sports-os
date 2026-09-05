import { api } from '@/lib/api';
import type { UnidadDeAnalisis, UnitEconomicsResultado } from '@/lib/types/reporting-ai';

function ComponenteView({ label, valor }: { label: string; valor: { value: number | null; disponible: boolean; razonNoDisponible?: string } }) {
  return (
    <div className="rounded border border-neutral-200 p-4">
      <h3 className="mb-1 text-sm font-semibold text-neutral-700">{label}</h3>
      {valor.disponible ? <p className="text-lg font-medium text-neutral-900">${valor.value!.toFixed(2)}</p> : <p className="text-xs text-amber-700">{valor.razonNoDisponible ?? 'No disponible'}</p>}
    </div>
  );
}

export default async function UnitEconomicsPage({ searchParams }: { searchParams: Promise<{ unit?: UnidadDeAnalisis; unitRef?: string; desde?: string; hasta?: string }> }) {
  const { unit, unitRef, desde, hasta } = await searchParams;

  let resultado: UnitEconomicsResultado | null = null;
  if (unit && unitRef && desde && hasta) {
    resultado = await api.get<UnitEconomicsResultado>(`/reporting-ai/unit-economics?unit=${unit}&unitRef=${unitRef}&desde=${desde}&hasta=${hasta}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Unit economics (UC-RPT-03)</h2>
        <p className="text-sm text-neutral-500">El costo directo y de HR pueden no ser atribuibles con el modelo de datos actual — se marcan explícitamente, nunca se inventa un cero.</p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Unidad</span>
          <select name="unit" defaultValue={unit ?? 'athlete'} className="rounded border border-neutral-300 px-3 py-2">
            <option value="athlete">Atleta</option>
            <option value="sport">Deporte</option>
            <option value="venue">Sede</option>
            <option value="coach_hour">Hora de coach</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Referencia (userId / deporte / venueId)</span>
          <input name="unitRef" defaultValue={unitRef} required className="w-56 rounded border border-neutral-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Desde</span>
          <input name="desde" type="date" defaultValue={desde} required className="rounded border border-neutral-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Hasta</span>
          <input name="hasta" type="date" defaultValue={hasta} required className="rounded border border-neutral-300 px-3 py-2" />
        </label>
        <button type="submit" className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white">
          Consultar
        </button>
      </form>

      {resultado && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <ComponenteView label="Ingreso" valor={resultado.revenue} />
          <ComponenteView label="Costo directo" valor={resultado.costoDirecto} />
          <ComponenteView label="Costo HR" valor={resultado.costoHr} />
          <ComponenteView label="Margen" valor={resultado.margen} />
        </div>
      )}
    </div>
  );
}
