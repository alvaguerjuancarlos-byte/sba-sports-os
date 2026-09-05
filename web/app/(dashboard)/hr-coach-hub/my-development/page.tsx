import { api, ApiError } from '@/lib/api';
import type { ResumenDeCoach, EmployeeAttendance } from '@/lib/types/hr-coach-hub';
import { CheckinButton } from './checkin-button';

export default async function MyDevelopmentPage() {
  const { employeeId } = await api.get<{ employeeId: string | null }>('/hr-coach-hub/employees/mine/id');

  if (!employeeId) {
    return <p className="text-sm text-neutral-500">No tienes un expediente de personal asociado a tu cuenta todavía.</p>;
  }

  let resumen: ResumenDeCoach | null = null;
  try {
    resumen = await api.get<ResumenDeCoach>(`/hr-coach-hub/employees/${employeeId}/development-summary`);
  } catch (e) {
    if (!(e instanceof ApiError && e.status === 403)) throw e;
  }

  const asistencias = await api.get<EmployeeAttendance[]>(`/hr-coach-hub/employees/${employeeId}/attendance`);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-neutral-900">Mi desarrollo (UC-HR-04/05)</h2>

      <CheckinButton employeeId={employeeId} />

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Mi asistencia</h3>
        <p className="text-sm text-neutral-600">{asistencias.length} check-in(s) registrado(s).</p>
      </div>

      {resumen && (
        <>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-neutral-700">Mis objetivos</h3>
            <ul className="flex flex-col gap-1 text-sm text-neutral-700">
              {resumen.objetivos.map((o) => (
                <li key={o.id}>
                  {o.period} — {o.objective_text} ({o.status})
                </li>
              ))}
            </ul>
            {resumen.objetivos.length === 0 && <p className="text-sm text-neutral-500">Sin objetivos definidos todavía.</p>}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-neutral-700">Mis equipos</h3>
            <ul className="flex flex-col gap-1 text-sm text-neutral-700">
              {resumen.equipos.map(
                (e, i) =>
                  e.team && (
                    <li key={i}>
                      {e.team.name} ({e.team.category}) — {e.standings[0] ? `${e.standings[0].points} pts` : 'sin standings'}
                    </li>
                  ),
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
