'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';

export interface AccionState {
  error: string | null;
}

const ESTADO_OK: AccionState = { error: null };

export async function crearQuestionConfigAction(_prevState: AccionState, formData: FormData): Promise<AccionState> {
  const sport = String(formData.get('sport') ?? '').trim();
  const question1Label = String(formData.get('question1Label') ?? '').trim();
  const question2Label = String(formData.get('question2Label') ?? '').trim();
  const question3Label = String(formData.get('question3Label') ?? '').trim();

  try {
    await api.post('/weekly-coach-feedback/question-configs', { sport, question1Label, question2Label, question3Label });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo crear la configuración.' };
  }

  revalidatePath('/weekly-feedback/question-configs');
  return ESTADO_OK;
}

export async function archivarQuestionConfigAction(configId: string): Promise<void> {
  await api.post(`/weekly-coach-feedback/question-configs/${configId}/archive`);
  revalidatePath('/weekly-feedback/question-configs');
}
