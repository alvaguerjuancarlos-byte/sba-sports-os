import { api, ApiError } from '@/lib/api';
import type { DevelopmentMap } from '@/lib/types/performance';
import { GenerateForm } from '../../generate-form';
import { DimensionsTable } from '../../dimensions-table';
import { SuggestionButton } from '../../suggestion-button';

export default async function AthleteDevelopmentMapPage({
  params,
  searchParams,
}: {
  params: Promise<{ athleteId: string }>;
  searchParams: Promise<{ dateRangeStart?: string; dateRangeEnd?: string }>;
}) {
  const { athleteId } = await params;
  const { dateRangeStart, dateRangeEnd } = await searchParams;

  let mapa: DevelopmentMap | null = null;
  if (dateRangeStart && dateRangeEnd) {
    mapa = await api
      .get<DevelopmentMap>(`/performance/development-maps/athletes/${athleteId}?dateRangeStart=${dateRangeStart}&dateRangeEnd=${dateRangeEnd}`)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      });
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-neutral-900">Development Map — atleta</h2>
      <GenerateForm scope="athlete" scopeRefId={athleteId} dateRangeStart={dateRangeStart} dateRangeEnd={dateRangeEnd} />

      {mapa && (
        <>
          <DimensionsTable dimensions={mapa.dimensions} />
          <SuggestionButton athleteId={athleteId} dateRangeStart={mapa.date_range_start} dateRangeEnd={mapa.date_range_end} />
        </>
      )}
      {dateRangeStart && dateRangeEnd && !mapa && <p className="text-sm text-neutral-500">Sin development map para ese rango todavía — generarlo arriba.</p>}
    </div>
  );
}
