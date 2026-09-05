'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';

export interface AccionState {
  error: string | null;
}

const ESTADO_OK: AccionState = { error: null };

// UC-PAY-02 — generar factura, ya sea a partir de un membership_plan o de un cargo ad hoc.
export async function generarInvoiceAction(_prevState: AccionState, formData: FormData): Promise<AccionState> {
  const athleteUserId = String(formData.get('athleteUserId') ?? '');
  const membershipPlanId = String(formData.get('membershipPlanId') ?? '');
  const productCatalogId = String(formData.get('productCatalogId') ?? '');
  const dueDate = String(formData.get('dueDate') ?? '');

  try {
    await api.post('/payments/invoices', {
      athleteUserId,
      membershipPlanId: membershipPlanId || undefined,
      productCatalogId: membershipPlanId ? undefined : productCatalogId || undefined,
      dueDate,
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo generar la factura.' };
  }

  revalidatePath('/payments/invoices');
  return ESTADO_OK;
}
