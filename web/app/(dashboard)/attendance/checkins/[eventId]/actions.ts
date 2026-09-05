'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';

export interface AccionState {
  error: string | null;
}

const ESTADO_OK: AccionState = { error: null };

// UC-ATT-01 — check-in facial; asume que la confirmación biométrica del proveedor externo ya
// ocurrió (esta plataforma no hace reconocimiento facial propio).
export async function registrarCheckinFacialAction(eventId: string, _prevState: AccionState, formData: FormData): Promise<AccionState> {
  const userId = String(formData.get('userId') ?? '');
  try {
    await api.post('/attendance-realtime/checkins/facial', { eventId, userId });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo registrar el check-in facial.' };
  }
  revalidatePath(`/attendance/checkins/${eventId}`);
  return ESTADO_OK;
}

// UC-ATT-02 — fallback manual; siempre registra quién confirmó, nunca queda auto-confirmado.
export async function registrarCheckinManualAction(eventId: string, _prevState: AccionState, formData: FormData): Promise<AccionState> {
  const userId = String(formData.get('userId') ?? '');
  try {
    await api.post('/attendance-realtime/checkins/manual', { eventId, userId });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo registrar el check-in manual.' };
  }
  revalidatePath(`/attendance/checkins/${eventId}`);
  return ESTADO_OK;
}
