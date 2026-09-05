'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';

export interface AccionState {
  error: string | null;
  aviso: string | null;
}

// UC-SPT-01 — crear temporada. Dos temporadas activas solapadas nunca se bloquean, solo se avisa.
export async function crearSeasonAction(_prevState: AccionState, formData: FormData): Promise<AccionState> {
  const name = String(formData.get('name') ?? '').trim();
  const startDate = String(formData.get('startDate') ?? '');
  const endDate = String(formData.get('endDate') ?? '');

  let resultado: { solapamientos: { name: string }[] };
  try {
    resultado = await api.post<{ solapamientos: { name: string }[] }>('/sports-hub/seasons', { name, startDate, endDate });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo crear la temporada.', aviso: null };
  }

  revalidatePath('/sports-hub/seasons');
  const aviso = resultado.solapamientos.length > 0 ? `Se solapa con: ${resultado.solapamientos.map((s) => s.name).join(', ')}` : null;
  return { error: null, aviso };
}

export async function cerrarSeasonAction(seasonId: string): Promise<void> {
  await api.post(`/sports-hub/seasons/${seasonId}/close`);
  revalidatePath('/sports-hub/seasons');
}
