'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';

export interface AccionState {
  error: string | null;
}

const ESTADO_OK: AccionState = { error: null };

export async function crearProspectoAction(_prevState: AccionState, formData: FormData): Promise<AccionState> {
  const name = String(formData.get('name') ?? '').trim();
  const contactInfo = String(formData.get('contactInfo') ?? '').trim();
  const source = String(formData.get('source') ?? '').trim();

  try {
    await api.post('/crm-enrollment/prospects', { name, contactInfo, source });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo crear el prospecto.' };
  }

  revalidatePath('/crm-enrollment');
  return ESTADO_OK;
}
