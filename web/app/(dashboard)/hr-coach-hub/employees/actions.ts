'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';

export interface AccionState {
  error: string | null;
}

const ESTADO_OK: AccionState = { error: null };

export async function crearExpedienteAction(_prevState: AccionState, formData: FormData): Promise<AccionState> {
  const userId = String(formData.get('userId') ?? '').trim();
  const contractType = String(formData.get('contractType') ?? '').trim();
  const hireDate = String(formData.get('hireDate') ?? '');

  try {
    await api.post('/hr-coach-hub/employees', { userId: userId || undefined, contractType, hireDate });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo crear el expediente.' };
  }

  revalidatePath('/hr-coach-hub/employees');
  return ESTADO_OK;
}
