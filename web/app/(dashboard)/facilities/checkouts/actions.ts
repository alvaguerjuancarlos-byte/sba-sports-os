'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';

export interface AccionState {
  error: string | null;
}

const ESTADO_OK: AccionState = { error: null };

// UC-FAC-02 — check-out; si la cantidad solicitada excede la disponible, el backend responde 409
// con la cantidad realmente disponible en ese momento.
export async function checkoutAction(_prevState: AccionState, formData: FormData): Promise<AccionState> {
  const inventoryItemId = String(formData.get('inventoryItemId') ?? '');
  const quantity = Number(formData.get('quantity') ?? 0);

  try {
    await api.post('/facilities-inventory/checkouts', { inventoryItemId, quantity });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo hacer el check-out.' };
  }

  revalidatePath('/facilities/checkouts');
  return ESTADO_OK;
}

export async function devolverAction(checkoutId: string): Promise<void> {
  await api.post(`/facilities-inventory/checkouts/${checkoutId}/return`);
  revalidatePath('/facilities/checkouts');
}
