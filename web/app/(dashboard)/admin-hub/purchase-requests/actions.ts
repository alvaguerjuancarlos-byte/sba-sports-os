'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';

export interface AccionState {
  error: string | null;
}

const ESTADO_OK: AccionState = { error: null };

// UC-ADM-02 — capturar solicitud de compra contra un budget_line.
export async function crearPurchaseRequestAction(_prevState: AccionState, formData: FormData): Promise<AccionState> {
  const budgetLineId = String(formData.get('budgetLineId') ?? '');
  const amount = String(formData.get('amount') ?? '');
  const justification = String(formData.get('justification') ?? '').trim();

  try {
    await api.post('/admin-hub/purchase-requests', { budgetLineId, amount, justification: justification || undefined });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo crear la solicitud de compra.' };
  }

  revalidatePath('/admin-hub/purchase-requests');
  return ESTADO_OK;
}

// UC-ADM-03 — aprobar/rechazar. approve no lleva body; reject requiere motivo.
export async function aprobarPurchaseRequestAction(purchaseRequestId: string): Promise<void> {
  await api.post(`/admin-hub/purchase-requests/${purchaseRequestId}/approve`);
  revalidatePath('/admin-hub/purchase-requests');
}

export async function rechazarPurchaseRequestAction(_prevState: AccionState, formData: FormData): Promise<AccionState> {
  const purchaseRequestId = String(formData.get('purchaseRequestId') ?? '');
  const rejectionReason = String(formData.get('rejectionReason') ?? '').trim();

  try {
    await api.post(`/admin-hub/purchase-requests/${purchaseRequestId}/reject`, { rejectionReason });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo rechazar la solicitud.' };
  }

  revalidatePath('/admin-hub/purchase-requests');
  return ESTADO_OK;
}
