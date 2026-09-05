'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';

export interface AccionState {
  error: string | null;
}

const ESTADO_OK: AccionState = { error: null };

// UC-CUP-01 — generar convocatoria. Integra Sports Hub (roster), Payments & Billing (elegibilidad)
// y este mismo dominio (reglas de formato, prioridad de alternos).
export async function generarConvocatoriaAction(eventId: string, _prevState: AccionState, formData: FormData): Promise<AccionState> {
  const format = String(formData.get('format') ?? '').trim();

  try {
    await api.post('/callup-engine/callup-lists', { eventId, format });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo generar la convocatoria.' };
  }

  revalidatePath(`/callup-engine/events/${eventId}`);
  return ESTADO_OK;
}

// UC-CUP-02 — aceptar/declinar. La reevaluación de elegibilidad en tiempo real y la promoción
// automática del siguiente alterno ocurren en el backend, no aquí.
export async function responderConvocatoriaAction(eventId: string, callupSlotId: string, decision: 'accepted' | 'declined'): Promise<void> {
  await api.post(`/callup-engine/callup-slots/${callupSlotId}/respond`, { decision });
  revalidatePath(`/callup-engine/events/${eventId}`);
}

// UC-CUP-04 — waiver de coach (excluir/incluir con comentario obligatorio, redactado a scope
// director en cualquier vista que no lo tenga).
export async function crearWaiverAction(eventId: string, callupListId: string, _prevState: AccionState, formData: FormData): Promise<AccionState> {
  const userId = String(formData.get('userId') ?? '');
  const action = String(formData.get('action') ?? '');
  const internalComment = String(formData.get('internalComment') ?? '').trim();

  try {
    await api.post(`/callup-engine/callup-lists/${callupListId}/waivers`, { userId, action, internalComment });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo aplicar el waiver.' };
  }

  revalidatePath(`/callup-engine/events/${eventId}`);
  return ESTADO_OK;
}
