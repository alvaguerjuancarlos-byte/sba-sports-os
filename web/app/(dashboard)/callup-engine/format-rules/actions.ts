'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';

export interface AccionState {
  error: string | null;
}

const ESTADO_OK: AccionState = { error: null };

export async function crearFormatRuleAction(_prevState: AccionState, formData: FormData): Promise<AccionState> {
  const sport = String(formData.get('sport') ?? '').trim();
  const format = String(formData.get('format') ?? '').trim();
  const maxPlayers = Number(formData.get('maxPlayers') ?? 0);
  const priorityWindowDays = String(formData.get('priorityWindowDays') ?? '').trim();

  try {
    await api.post('/callup-engine/format-rules', {
      sport,
      format,
      maxPlayers,
      priorityWindowDays: priorityWindowDays ? Number(priorityWindowDays) : undefined,
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo crear la regla de formato.' };
  }

  revalidatePath('/callup-engine/format-rules');
  return ESTADO_OK;
}

export async function archivarFormatRuleAction(formatRuleId: string): Promise<void> {
  await api.post(`/callup-engine/format-rules/${formatRuleId}/archive`);
  revalidatePath('/callup-engine/format-rules');
}
