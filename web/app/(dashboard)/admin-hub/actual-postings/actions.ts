'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';

export interface AccionState {
  error: string | null;
}

const ESTADO_OK: AccionState = { error: null };

// UC-ADM-05 — registrar el gasto real contra una orden de compra (libera/consume el commitment).
export async function registrarActualPostingAction(_prevState: AccionState, formData: FormData): Promise<AccionState> {
  const purchaseOrderId = String(formData.get('purchaseOrderId') ?? '');
  const amount = String(formData.get('amount') ?? '');
  const postedAt = String(formData.get('postedAt') ?? '').trim();

  try {
    await api.post('/admin-hub/actual-postings', { purchaseOrderId, amount, postedAt: postedAt || undefined });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo registrar el gasto real.' };
  }

  revalidatePath('/admin-hub/actual-postings');
  return ESTADO_OK;
}
