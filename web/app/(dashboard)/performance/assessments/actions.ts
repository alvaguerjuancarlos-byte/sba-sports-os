'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';

export interface AccionState {
  error: string | null;
}

const ESTADO_OK: AccionState = { error: null };

export async function registrarEvaluacionAction(playerId: string, _prevState: AccionState, formData: FormData): Promise<AccionState> {
  const assessmentDate = String(formData.get('assessmentDate') ?? '');
  const category = String(formData.get('category') ?? '').trim();
  const score = Number(formData.get('score') ?? 0);
  const notes = String(formData.get('notes') ?? '').trim();

  try {
    await api.post('/performance/assessments', { playerId, assessmentDate, category, score, notes: notes || undefined });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo registrar la evaluación.' };
  }

  revalidatePath('/performance/assessments');
  return ESTADO_OK;
}
