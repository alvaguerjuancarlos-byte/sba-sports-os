'use client';

import { useTransition } from 'react';
import { responderRsvpAction } from './actions';
import type { CalendarEvent } from '@/lib/types/calendar-rsvp';

const ETIQUETA_TIPO: Record<CalendarEvent['type'], string> = {
  match: 'Partido',
  training: 'Entrenamiento',
  tournament: 'Torneo',
};

function RsvpButtons({ attendanceId }: { attendanceId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex gap-2">
      <button type="button" disabled={pending} onClick={() => startTransition(async () => responderRsvpAction(attendanceId, 'confirmed'))} className="text-xs text-green-700 underline">
        Confirmar
      </button>
      <button type="button" disabled={pending} onClick={() => startTransition(async () => responderRsvpAction(attendanceId, 'declined'))} className="text-xs text-red-600 underline">
        Declinar
      </button>
    </div>
  );
}

export function EventCard({ evento, nombreVenue, nombreEquipo, nombrePorHijo }: { evento: CalendarEvent; nombreVenue: string; nombreEquipo: string; nombrePorHijo: Map<string, string> }) {
  return (
    <li className="rounded border border-neutral-200 p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium text-neutral-900">
          {ETIQUETA_TIPO[evento.type]} — {nombreEquipo}
        </span>
        <span className="text-xs text-neutral-500">{new Date(evento.start_at).toLocaleString('es-MX')}</span>
      </div>
      <p className="text-xs text-neutral-500">{nombreVenue}</p>

      {(evento.confirmados !== undefined || evento.declinados !== undefined || evento.pendientes !== undefined) && (
        <p className="mt-1 text-xs text-neutral-600">
          Confirmados: {evento.confirmados ?? 0} · Declinados: {evento.declinados ?? 0} · Pendientes: {evento.pendientes ?? 0}
        </p>
      )}

      {evento.miAttendanceId && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-neutral-600">Tu RSVP: {evento.miRsvp}</span>
          {evento.miRsvp === 'pending' && <RsvpButtons attendanceId={evento.miAttendanceId} />}
        </div>
      )}

      {evento.attendancesDeHijos && evento.attendancesDeHijos.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          {evento.attendancesDeHijos.map((a) => (
            <div key={a.attendanceId} className="flex items-center gap-2">
              <span className="text-xs text-neutral-600">
                {nombrePorHijo.get(a.athleteUserId) ?? 'Tu hijo/a'}: {a.status}
              </span>
              {a.status === 'pending' && <RsvpButtons attendanceId={a.attendanceId} />}
            </div>
          ))}
        </div>
      )}
    </li>
  );
}
