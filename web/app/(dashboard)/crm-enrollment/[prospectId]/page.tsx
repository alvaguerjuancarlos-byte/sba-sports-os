import { api } from '@/lib/api';
import type { Prospect, TrialClassAttendance } from '@/lib/types/crm-enrollment';
import type { CalendarEvent } from '@/lib/types/calendar-rsvp';
import type { ProductCatalogItem } from '@/lib/types/configuration-studio';
import type { Team } from '@/lib/types/sports-hub';
import { StageButtons } from './stage-buttons';
import { TrialClassSection } from './trial-class-section';
import { ConvertForm } from './convert-form';

export default async function ProspectDetailPage({ params }: { params: Promise<{ prospectId: string }> }) {
  const { prospectId } = await params;

  const [prospect, trialClasses, eventos, productos, equipos] = await Promise.all([
    api.get<Prospect>(`/crm-enrollment/prospects/${prospectId}`),
    api.get<TrialClassAttendance[]>(`/crm-enrollment/prospects/${prospectId}/trial-classes`),
    api.get<CalendarEvent[]>('/calendar-rsvp/calendar'),
    api.get<ProductCatalogItem[]>('/config/product-catalog'),
    api.get<Team[]>('/sports-hub/teams'),
  ]);

  const nombrePorEquipo = new Map(equipos.map((t) => [t.id, t.name]));
  const nombrePorEvento = new Map(eventos.map((e) => [e.id, e.team_id ? (nombrePorEquipo.get(e.team_id) ?? 'Evento') : 'Multi-equipo']));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">{prospect.name}</h2>
        <p className="text-sm text-neutral-500">
          {prospect.contact_info} · {prospect.source}
        </p>
        {prospect.converted_at && <p className="mt-1 text-sm text-green-700">Convertido el {new Date(prospect.converted_at).toLocaleDateString('es-MX')}</p>}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Etapa del funnel (UC-CRM-01)</h3>
        <StageButtons prospectId={prospectId} stageActual={prospect.stage} />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Clases de prueba (UC-CRM-02)</h3>
        <TrialClassSection prospectId={prospectId} trialClasses={trialClasses} eventos={eventos} nombrePorEvento={nombrePorEvento} />
      </div>

      {!prospect.converted_at && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-neutral-700">Convertir a inscripción (UC-CRM-03)</h3>
          <ConvertForm prospectId={prospectId} productosActivos={productos.filter((p) => p.status === 'active')} />
        </div>
      )}
    </div>
  );
}
