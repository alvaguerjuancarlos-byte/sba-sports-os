'use client';

import { useActionState, useTransition } from 'react';
import { agendarClasePruebaAction, marcarAsistenciaAction } from './actions';
import type { AccionState } from './actions';
import type { TrialClassAttendance } from '@/lib/types/crm-enrollment';
import type { CalendarEvent } from '@/lib/types/calendar-rsvp';

const ESTADO_INICIAL: AccionState = { error: null };

function AttendanceButtons({ prospectId, trialClass }: { prospectId: string; trialClass: TrialClassAttendance }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => marcarAsistenciaAction(prospectId, trialClass.id, true))}
        className="text-xs text-green-700 underline"
      >
        Asistió
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => marcarAsistenciaAction(prospectId, trialClass.id, false))}
        className="text-xs text-red-600 underline"
      >
        No asistió
      </button>
    </div>
  );
}

export function TrialClassSection({
  prospectId,
  trialClasses,
  eventos,
  nombrePorEvento,
}: {
  prospectId: string;
  trialClasses: TrialClassAttendance[];
  eventos: CalendarEvent[];
  nombrePorEvento: Map<string, string>;
}) {
  const accion = agendarClasePruebaAction.bind(null, prospectId);
  const [state, formAction, pending] = useActionState(accion, ESTADO_INICIAL);

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {trialClasses.map((t) => (
          <li key={t.id} className="flex items-center justify-between rounded border border-neutral-200 px-3 py-2 text-sm">
            <span>{nombrePorEvento.get(t.event_id) ?? t.event_id}</span>
            {t.attended === null ? (
              <AttendanceButtons prospectId={prospectId} trialClass={t} />
            ) : (
              <span className={`text-xs font-medium ${t.attended ? 'text-green-700' : 'text-red-600'}`}>{t.attended ? 'Asistió' : 'No asistió'}</span>
            )}
          </li>
        ))}
      </ul>
      {trialClasses.length === 0 && <p className="text-sm text-neutral-500">Sin clases de prueba agendadas.</p>}

      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Agendar clase de prueba (evento)</span>
          <select name="eventId" required defaultValue="" className="w-56 rounded border border-neutral-300 px-3 py-2">
            <option value="" disabled>
              — elegir —
            </option>
            {eventos.map((e) => (
              <option key={e.id} value={e.id}>
                {nombrePorEvento.get(e.id) ?? e.id} — {new Date(e.start_at).toLocaleString('es-MX')}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={pending} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
          {pending ? 'Agendando…' : 'Agendar'}
        </button>
        {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      </form>
    </div>
  );
}
