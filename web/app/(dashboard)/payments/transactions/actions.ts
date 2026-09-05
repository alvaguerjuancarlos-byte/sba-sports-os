'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';

export interface AccionState {
  error: string | null;
}

const ESTADO_OK: AccionState = { error: null };

// UC-PAY-03 — registrar un pago recibido por otro medio (fuera del link de pago del proveedor).
export async function registrarPagoAction(_prevState: AccionState, formData: FormData): Promise<AccionState> {
  const invoiceId = String(formData.get('invoiceId') ?? '');
  const providerTxnId = String(formData.get('providerTxnId') ?? '').trim();
  const amount = String(formData.get('amount') ?? '');
  const status = String(formData.get('status') ?? 'processed');

  try {
    await api.post('/payments/transactions', { invoiceId, providerTxnId, amount, status });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo registrar el pago.' };
  }

  revalidatePath('/payments/transactions');
  revalidatePath('/payments/invoices');
  return ESTADO_OK;
}

// UC-PAY-03, paso 5 — reconciliar contra el estado reportado por el proveedor.
export async function reconciliarAction(transactionId: string, estadoReportadoPorProveedor: 'processed' | 'failed'): Promise<void> {
  await api.post(`/payments/transactions/${transactionId}/reconcile`, { estadoReportadoPorProveedor });
  revalidatePath('/payments/transactions');
}
