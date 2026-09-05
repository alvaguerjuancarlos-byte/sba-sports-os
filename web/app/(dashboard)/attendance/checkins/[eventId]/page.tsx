import { api } from '@/lib/api';
import type { RevisarAsistenciaResultado } from '@/lib/types/attendance-realtime';
import type { UsuarioDeOrganizacion } from '@/lib/types/identity';
import { CheckinForms } from './checkin-forms';

export default async function CheckinDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;

  const [asistencia, aforo, usuarios] = await Promise.all([
    api.get<RevisarAsistenciaResultado>(`/attendance-realtime/events/${eventId}/attendance-review`),
    api.get<number>(`/attendance-realtime/events/${eventId}/headcount`),
    api.get<UsuarioDeOrganizacion[]>('/identity/users'),
  ]);
  const nombrePorUsuario = new Map(usuarios.map((u) => [u.user_id, u.full_name]));
  const faltantesConNombre = usuarios.filter((u) => asistencia.faltantes.includes(u.user_id));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Asistencia del evento (UC-ATT-01 a 04)</h2>
        <p className="text-sm text-neutral-500">Aforo actual: {aforo}</p>
      </div>

      <CheckinForms eventId={eventId} faltantesConNombre={faltantesConNombre} />

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Presentes</h3>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="py-2 pr-4">Persona</th>
              <th className="py-2 pr-4">Método</th>
              <th className="py-2 pr-4">Hora</th>
              <th className="py-2 pr-4">Revisión</th>
            </tr>
          </thead>
          <tbody>
            {asistencia.presentes.map((c) => (
              <tr key={c.id} className="border-b border-neutral-100">
                <td className="py-2 pr-4">{nombrePorUsuario.get(c.user_id) ?? '—'}</td>
                <td className="py-2 pr-4">{c.method === 'facial' ? 'Facial' : 'Manual'}</td>
                <td className="py-2 pr-4 text-neutral-500">{new Date(c.checked_in_at).toLocaleTimeString('es-MX')}</td>
                <td className="py-2 pr-4">
                  {c.flagged_for_review && <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">fuera de roster</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {asistencia.presentes.length === 0 && <p className="text-sm text-neutral-500">Sin check-ins todavía.</p>}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Faltantes del roster esperado</h3>
        <ul className="flex flex-col gap-1 text-sm text-neutral-600">
          {faltantesConNombre.map((u) => (
            <li key={u.user_id}>{u.full_name}</li>
          ))}
        </ul>
        {faltantesConNombre.length === 0 && <p className="text-sm text-neutral-500">Sin faltantes.</p>}
      </div>
    </div>
  );
}
