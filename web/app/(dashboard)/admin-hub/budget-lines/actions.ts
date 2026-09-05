'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';

export interface AccionState {
  error: string | null;
}

const ESTADO_OK: AccionState = { error: null };

// UC-ADM-01 — crear budget_line por temporada/dimensión.
export async function crearBudgetLineAction(_prevState: AccionState, formData: FormData): Promise<AccionState> {
  const financialDimensionId = String(formData.get('financialDimensionId') ?? '');
  const season = String(formData.get('season') ?? '').trim();
  const period = String(formData.get('period') ?? '').trim();
  const amountBudgeted = String(formData.get('amountBudgeted') ?? '');

  try {
    await api.post('/admin-hub/budget-lines', { financialDimensionId, season, period, amountBudgeted });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo crear el budget_line.' };
  }

  revalidatePath('/admin-hub/budget-lines');
  return ESTADO_OK;
}

export async function archivarBudgetLineAction(budgetLineId: string): Promise<void> {
  await api.post(`/admin-hub/budget-lines/${budgetLineId}/archive`);
  revalidatePath('/admin-hub/budget-lines');
}
