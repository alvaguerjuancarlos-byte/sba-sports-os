'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';

export interface AccionState {
  error: string | null;
}

const ESTADO_OK: AccionState = { error: null };

export async function otorgarMediaConsentAction(_prevState: AccionState, formData: FormData): Promise<AccionState> {
  const userId = String(formData.get('userId') ?? '');
  try {
    await api.post(`/player-card/media-consent/${userId}/grant`);
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo otorgar el consentimiento.' };
  }
  revalidatePath('/player-card/media-consent');
  return ESTADO_OK;
}

export async function revocarMediaConsentAction(_prevState: AccionState, formData: FormData): Promise<AccionState> {
  const userId = String(formData.get('userId') ?? '');
  try {
    await api.post(`/player-card/media-consent/${userId}/revoke`);
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo revocar el consentimiento.' };
  }
  revalidatePath('/player-card/media-consent');
  return ESTADO_OK;
}
