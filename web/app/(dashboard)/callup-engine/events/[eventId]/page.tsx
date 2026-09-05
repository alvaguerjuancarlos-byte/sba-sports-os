import { api, ApiError } from '@/lib/api';
import { exigirSesion } from '@/lib/session';
import { listarDirectorio } from '@/lib/identity';
import type { ConsultarConvocatoriaResultado } from '@/lib/types/callup-engine';
import { GenerateForm } from './generate-form';
import { SlotRow } from './slot-row';

export default async function CallupEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const sesion = await exigirSesion();
  const esStaff = sesion.roles.includes('admin') || sesion.roles.includes('director') || sesion.roles.includes('coach');
  const puedeGenerar = esStaff;
  const puedeAplicarWaiver = sesion.roles.includes('admin') || sesion.roles.includes('director') || sesion.roles.includes('coach');

  let convocatoria: ConsultarConvocatoriaResultado | null = null;
  try {
    convocatoria = await api.get<ConsultarConvocatoriaResultado>(`/callup-engine/events/${eventId}/callup`);
  } catch (e) {
    if (!(e instanceof ApiError && e.status === 404)) throw e;
  }

  const usuarios = esStaff ? await listarDirectorio() : [];
  const nombrePorUsuario = new Map(usuarios.map((u) => [u.user_id, u.full_name]));

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-neutral-900">Convocatoria (UC-CUP-01 a 05)</h2>

      {!convocatoria && puedeGenerar && <GenerateForm eventId={eventId} />}
      {!convocatoria && !puedeGenerar && <p className="text-sm text-neutral-500">Todavía no hay convocatoria para este evento.</p>}

      {convocatoria && (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="py-2 pr-4">Persona</th>
              <th className="py-2 pr-4">Estado</th>
              <th className="py-2 pr-4">Prioridad</th>
              <th className="py-2 pr-4">Waivers</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {convocatoria.slots.map((s) => (
              <SlotRow
                key={s.id}
                eventId={eventId}
                callupListId={convocatoria!.callupList.id}
                slot={s}
                nombrePersona={esStaff ? (nombrePorUsuario.get(s.user_id) ?? '—') : s.user_id === sesion.userId ? 'Tú' : 'Tu hijo/a'}
                puedeResponder={!esStaff}
                puedeAplicarWaiver={puedeAplicarWaiver}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
