'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';
import type { NotificationChannel } from '@/lib/types/family-communications';

export interface AccionState {
  error: string | null;
}

const ESTADO_OK: AccionState = { error: null };

export async function configurarPreferenciaAction(_prevState: AccionState, formData: FormData): Promise<AccionState> {
  const notificationType = String(formData.get('notificationType') ?? '').trim();
  const channel = String(formData.get('channel') ?? '') as Exclude<NotificationChannel, 'in_app'>;
  const enabled = formData.get('enabled') === 'on';

  try {
    await api.post('/family-communications/notification-preferences', { notificationType, channel, enabled });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo guardar la preferencia.' };
  }

  revalidatePath('/family/notification-preferences');
  return ESTADO_OK;
}
