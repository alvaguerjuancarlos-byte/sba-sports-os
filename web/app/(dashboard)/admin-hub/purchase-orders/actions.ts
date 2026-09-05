'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';

export interface AccionState {
  error: string | null;
}

const ESTADO_OK: AccionState = { error: null };

// UC-ADM-04 — emitir orden de compra a partir de una solicitud ya aprobada.
export async function emitirPurchaseOrderAction(_prevState: AccionState, formData: FormData): Promise<AccionState> {
  const purchaseRequestId = String(formData.get('purchaseRequestId') ?? '');
  const vendorId = String(formData.get('vendorId') ?? '');

  try {
    await api.post('/admin-hub/purchase-orders', { purchaseRequestId, vendorId });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo emitir la orden de compra.' };
  }

  revalidatePath('/admin-hub/purchase-orders');
  return ESTADO_OK;
}
