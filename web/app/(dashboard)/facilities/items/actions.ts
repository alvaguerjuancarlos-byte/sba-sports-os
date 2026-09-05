'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';

export interface AccionState {
  error: string | null;
}

const ESTADO_OK: AccionState = { error: null };

export async function crearInventoryItemAction(_prevState: AccionState, formData: FormData): Promise<AccionState> {
  const venueId = String(formData.get('venueId') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const category = String(formData.get('category') ?? '').trim();
  const quantityTotal = Number(formData.get('quantityTotal') ?? 0);

  try {
    await api.post('/facilities-inventory/items', { venueId, name, category, quantityTotal });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo crear el material.' };
  }

  revalidatePath('/facilities/items');
  return ESTADO_OK;
}

export async function archivarInventoryItemAction(itemId: string): Promise<void> {
  await api.post(`/facilities-inventory/items/${itemId}/archive`);
  revalidatePath('/facilities/items');
}
