'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';

export interface AccionState {
  error: string | null;
}

const ESTADO_OK: AccionState = { error: null };

export async function crearVendorAction(_prevState: AccionState, formData: FormData): Promise<AccionState> {
  const name = String(formData.get('name') ?? '').trim();
  const taxId = String(formData.get('taxId') ?? '').trim();

  try {
    await api.post('/admin-hub/vendors', { name, taxId: taxId || undefined });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo crear el proveedor.' };
  }

  revalidatePath('/admin-hub/vendors');
  return ESTADO_OK;
}

export async function archivarVendorAction(vendorId: string): Promise<void> {
  await api.post(`/admin-hub/vendors/${vendorId}/archive`);
  revalidatePath('/admin-hub/vendors');
}
