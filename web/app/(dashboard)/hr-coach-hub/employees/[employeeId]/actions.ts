'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';
import type { CoachObjectiveStatus, EmployeeStatus } from '@/lib/types/hr-coach-hub';

export interface AccionState {
  error: string | null;
}

const ESTADO_OK: AccionState = { error: null };

export async function actualizarExpedienteAction(employeeId: string, status: EmployeeStatus): Promise<void> {
  await api.post(`/hr-coach-hub/employees/${employeeId}`, { status });
  revalidatePath(`/hr-coach-hub/employees/${employeeId}`);
}

export async function capturarPayrollInputAction(employeeId: string, _prevState: AccionState, formData: FormData): Promise<AccionState> {
  const period = String(formData.get('period') ?? '').trim();
  const hours = String(formData.get('hours') ?? '').trim();
  const bonuses = String(formData.get('bonuses') ?? '').trim();
  const deductionsNotes = String(formData.get('deductionsNotes') ?? '').trim();

  try {
    await api.post(`/hr-coach-hub/employees/${employeeId}/payroll-inputs`, {
      period,
      hours: hours ? Number(hours) : undefined,
      bonuses: bonuses ? Number(bonuses) : undefined,
      deductionsNotes: deductionsNotes || undefined,
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo capturar el insumo de nómina.' };
  }

  revalidatePath(`/hr-coach-hub/employees/${employeeId}`);
  return ESTADO_OK;
}

export async function definirObjetivoAction(employeeId: string, _prevState: AccionState, formData: FormData): Promise<AccionState> {
  const period = String(formData.get('period') ?? '').trim();
  const objectiveText = String(formData.get('objectiveText') ?? '').trim();

  try {
    await api.post(`/hr-coach-hub/employees/${employeeId}/objectives`, { period, objectiveText });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo definir el objetivo.' };
  }

  revalidatePath(`/hr-coach-hub/employees/${employeeId}`);
  return ESTADO_OK;
}

export async function actualizarStatusObjetivoAction(employeeId: string, objectiveId: string, status: CoachObjectiveStatus): Promise<void> {
  await api.post(`/hr-coach-hub/employees/${employeeId}/objectives/${objectiveId}/status`, { status });
  revalidatePath(`/hr-coach-hub/employees/${employeeId}`);
}
