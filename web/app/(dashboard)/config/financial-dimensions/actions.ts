'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';

export interface AccionState {
  error: string | null;
}

const ESTADO_OK: AccionState = { error: null };

// UC-CFG-01 — crear una dimensión financiera nueva (class/group/budget_line/concept).
export async function crearDimensionAction(_prevState: AccionState, formData: FormData): Promise<AccionState> {
  const type = String(formData.get('type') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const parentId = String(formData.get('parentId') ?? '').trim();

  try {
    await api.post('/config/financial-dimensions', { type, name, parentId: parentId || undefined });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo crear la dimensión.' };
  }

  revalidatePath('/config/financial-dimensions');
  return ESTADO_OK;
}

// UC-CFG-01 — archivar, nunca borrar.
export async function archivarDimensionAction(dimensionId: string): Promise<void> {
  await api.post(`/config/financial-dimensions/${dimensionId}/archive`);
  revalidatePath('/config/financial-dimensions');
}

// UC-PAY-05 — marca si un cargo vencido de esta dimensión bloquea convocatoria.
export async function actualizarQualifyingForBlockAction(dimensionId: string, isQualifyingForBlock: boolean): Promise<void> {
  await api.post(`/config/financial-dimensions/${dimensionId}/qualifying-for-block`, { isQualifyingForBlock });
  revalidatePath('/config/financial-dimensions');
}
