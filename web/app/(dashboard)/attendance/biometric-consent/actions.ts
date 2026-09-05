'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';

export interface AccionState {
  error: string | null;
}

const ESTADO_OK: AccionState = { error: null };

// UC-ATT-05 — el gate real (propio adulto, o tutor con guardian_link si es menor) vive en el
// backend; esta pantalla solo reenvía userId (por defecto uno mismo, o el que se indique).
export async function otorgarConsentimientoAction(_prevState: AccionState, formData: FormData): Promise<AccionState> {
  const userId = String(formData.get('userId') ?? '');
  try {
    await api.post(`/attendance-realtime/biometric-consent/${userId}/grant`);
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo otorgar el consentimiento.' };
  }
  revalidatePath('/attendance/biometric-consent');
  return ESTADO_OK;
}

export async function revocarConsentimientoAction(_prevState: AccionState, formData: FormData): Promise<AccionState> {
  const userId = String(formData.get('userId') ?? '');
  try {
    await api.post(`/attendance-realtime/biometric-consent/${userId}/revoke`);
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo revocar el consentimiento.' };
  }
  revalidatePath('/attendance/biometric-consent');
  return ESTADO_OK;
}

export async function registrarTemplateAction(_prevState: AccionState, formData: FormData): Promise<AccionState> {
  const userId = String(formData.get('userId') ?? '');
  const providerRef = String(formData.get('providerRef') ?? '').trim();
  try {
    await api.post(`/attendance-realtime/biometric-consent/${userId}/template`, { providerRef });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo registrar el template.' };
  }
  revalidatePath('/attendance/biometric-consent');
  return ESTADO_OK;
}
