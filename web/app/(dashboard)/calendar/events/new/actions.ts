'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';

export interface ConflictoEvento {
  id: string;
  startAt: string;
  endAt: string;
  teamId: string | null;
}

export interface AccionState {
  error: string | null;
  conflictos: ConflictoEvento[] | null;
  invitacionesGeneradas: number | null;
}

// UC-CAL-01/02 — crear evento; un conflicto de horario en el venue bloquea la creación salvo que
// se confirme explícitamente (forceOverlap), y solo admin/director tiene ese permiso.
export async function crearEventoAction(_prevState: AccionState, formData: FormData): Promise<AccionState> {
  const type = String(formData.get('type') ?? '');
  const teamId = String(formData.get('teamId') ?? '');
  const leagueCupId = String(formData.get('leagueCupId') ?? '');
  const venueId = String(formData.get('venueId') ?? '');
  const startAt = String(formData.get('startAt') ?? '');
  const endAt = String(formData.get('endAt') ?? '');
  const forceOverlap = formData.get('forceOverlap') === 'on';

  try {
    const resultado = await api.post<{ invitacionesGeneradas: number }>('/calendar-rsvp/events', {
      type,
      teamId: teamId || undefined,
      leagueCupId: leagueCupId || undefined,
      venueId,
      startAt,
      endAt,
      forceOverlap,
    });
    revalidatePath('/calendar');
    return { error: null, conflictos: null, invitacionesGeneradas: resultado.invitacionesGeneradas };
  } catch (e) {
    if (e instanceof ApiError && e.status === 409 && typeof e.body === 'object' && e.body !== null && 'conflictos' in e.body) {
      return { error: e.message, conflictos: (e.body as { conflictos: ConflictoEvento[] }).conflictos, invitacionesGeneradas: null };
    }
    return { error: e instanceof ApiError ? e.message : 'No se pudo crear el evento.', conflictos: null, invitacionesGeneradas: null };
  }
}
