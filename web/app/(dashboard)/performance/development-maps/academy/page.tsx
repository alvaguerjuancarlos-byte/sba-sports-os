import { api, ApiError } from '@/lib/api';
import type { DevelopmentMap } from '@/lib/types/performance';
import { GenerateForm } from '../generate-form';
import { DimensionsTable } from '../dimensions-table';

export default async function AcademyDevelopmentMapPage({ searchParams }: { searchParams: Promise<{ dateRangeStart?: string; dateRangeEnd?: string }> }) {
  const { dateRangeStart, dateRangeEnd } = await searchParams;

  let mapa: DevelopmentMap | null = null;
  if (dateRangeStart && dateRangeEnd) {
    mapa = await api.get<DevelopmentMap>(`/performance/development-maps/academy?dateRangeStart=${dateRangeStart}&dateRangeEnd=${dateRangeEnd}`).catch((e) => {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Development Map — academia completa</h2>
        <p className="text-sm text-neutral-500">Agrega todos los equipos activos de la organización — un atleta con doble militancia cuenta una sola vez.</p>
      </div>
      <GenerateForm scope="academy" scopeRefId="" dateRangeStart={dateRangeStart} dateRangeEnd={dateRangeEnd} />
      {mapa && <DimensionsTable dimensions={mapa.dimensions} />}
      {dateRangeStart && dateRangeEnd && !mapa && <p className="text-sm text-neutral-500">Sin development map para ese rango todavía — generarlo arriba.</p>}
    </div>
  );
}
