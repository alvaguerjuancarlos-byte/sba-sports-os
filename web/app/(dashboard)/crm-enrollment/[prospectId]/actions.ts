'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';
import type { ProspectStage } from '@/lib/types/crm-enrollment';
import type { BillingCycle } from '@/lib/types/payments-billing';

export interface AccionState {
  error: string | null;
}

const ESTADO_OK: AccionState = { error: null };

export async function cambiarStageAction(prospectId: string, stage: ProspectStage): Promise<void> {
  await api.post(`/crm-enrollment/prospects/${prospectId}/stage`, { stage });
  revalidatePath(`/crm-enrollment/${prospectId}`);
}

// UC-CRM-02 — agendar clase de prueba contra un evento existente (training/tournament).
export async function agendarClasePruebaAction(prospectId: string, _prevState: AccionState, formData: FormData): Promise<AccionState> {
  const eventId = String(formData.get('eventId') ?? '');

  try {
    await api.post(`/crm-enrollment/prospects/${prospectId}/trial-classes`, { eventId });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo agendar la clase de prueba.' };
  }

  revalidatePath(`/crm-enrollment/${prospectId}`);
  return ESTADO_OK;
}

export async function marcarAsistenciaAction(prospectId: string, trialClassAttendanceId: string, attended: boolean): Promise<void> {
  await api.post(`/crm-enrollment/trial-classes/${trialClassAttendanceId}/attendance`, { attended });
  revalidatePath(`/crm-enrollment/${prospectId}`);
}

// UC-CRM-03 — conversión one-click: alta de usuario + rol + enrollment + membership_plan, en el
// mismo flujo que Identity & Access (UC-ID-01/03) si el nuevo atleta es menor.
export async function convertirProspectoAction(prospectId: string, _prevState: AccionState, formData: FormData): Promise<AccionState> {
  const dateOfBirth = String(formData.get('dateOfBirth') ?? '');
  const email = String(formData.get('email') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const guardianUserId = String(formData.get('guardianUserId') ?? '').trim();
  const productCatalogId = String(formData.get('productCatalogId') ?? '');
  const currency = String(formData.get('currency') ?? '').trim();
  const billingCycle = String(formData.get('billingCycle') ?? '') as BillingCycle;

  try {
    await api.post(`/crm-enrollment/prospects/${prospectId}/convert`, {
      dateOfBirth,
      email: email || undefined,
      phone: phone || undefined,
      guardianUserId: guardianUserId || undefined,
      productCatalogId,
      currency,
      billingCycle,
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo convertir el prospecto.' };
  }

  revalidatePath(`/crm-enrollment/${prospectId}`);
  return ESTADO_OK;
}
