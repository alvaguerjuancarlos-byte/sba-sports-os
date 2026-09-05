'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';

export interface AccionState {
  error: string | null;
}

const ESTADO_OK: AccionState = { error: null };

// UC-PAY-01 — configurar plan de membresía a partir de un producto del catálogo.
export async function crearMembershipPlanAction(_prevState: AccionState, formData: FormData): Promise<AccionState> {
  const athleteUserId = String(formData.get('athleteUserId') ?? '');
  const productCatalogId = String(formData.get('productCatalogId') ?? '');
  const currency = String(formData.get('currency') ?? '').trim();
  const billingCycle = String(formData.get('billingCycle') ?? '');

  try {
    await api.post('/payments/membership-plans', { athleteUserId, productCatalogId, currency, billingCycle });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo crear el plan de membresía.' };
  }

  revalidatePath('/payments/membership-plans');
  return ESTADO_OK;
}

export async function cancelarMembershipPlanAction(membershipPlanId: string): Promise<void> {
  await api.post(`/payments/membership-plans/${membershipPlanId}/cancel`);
  revalidatePath('/payments/membership-plans');
}

// UC-PAY-04 — aplicar beca, restringido a scope 'director' por el propio servicio.
export async function aplicarBecaAction(_prevState: AccionState, formData: FormData): Promise<AccionState> {
  const membershipPlanId = String(formData.get('membershipPlanId') ?? '');
  const scholarshipPct = String(formData.get('scholarshipPct') ?? '').trim();
  const scholarshipAmount = String(formData.get('scholarshipAmount') ?? '').trim();

  try {
    await api.post(`/payments/membership-plans/${membershipPlanId}/scholarship`, {
      scholarshipPct: scholarshipPct ? Number(scholarshipPct) : undefined,
      scholarshipAmount: scholarshipAmount ? Number(scholarshipAmount) : undefined,
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo aplicar la beca.' };
  }

  revalidatePath('/payments/membership-plans');
  return ESTADO_OK;
}
