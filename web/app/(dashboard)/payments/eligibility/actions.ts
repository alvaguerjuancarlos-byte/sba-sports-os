'use server';

import { api, ApiError } from '@/lib/api';
import type { EligibilityResult } from '@/lib/types/payments-billing';

export interface EligibilidadState {
  resultado: EligibilityResult | null;
  error: string | null;
}

// UC-PAY-05 — consultar elegibilidad financiera de un atleta.
export async function consultarElegibilidadAction(_prevState: EligibilidadState, formData: FormData): Promise<EligibilidadState> {
  const athleteUserId = String(formData.get('athleteUserId') ?? '');
  try {
    const resultado = await api.get<EligibilityResult>(`/internal/payments/eligibility/${athleteUserId}`);
    return { resultado, error: null };
  } catch (e) {
    return { resultado: null, error: e instanceof ApiError ? e.message : 'No se pudo consultar la elegibilidad.' };
  }
}
