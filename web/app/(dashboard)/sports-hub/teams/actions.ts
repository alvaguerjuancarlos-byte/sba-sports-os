'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';

export interface AccionState {
  error: string | null;
}

const ESTADO_OK: AccionState = { error: null };

// UC-SPT-02 — crear equipo dentro de una temporada.
export async function crearTeamAction(_prevState: AccionState, formData: FormData): Promise<AccionState> {
  const name = String(formData.get('name') ?? '').trim();
  const category = String(formData.get('category') ?? '').trim();
  const sport = String(formData.get('sport') ?? '').trim();
  const seasonId = String(formData.get('seasonId') ?? '');

  try {
    await api.post('/sports-hub/teams', { name, category, sport, seasonId });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo crear el equipo.' };
  }

  revalidatePath('/sports-hub/teams');
  return ESTADO_OK;
}

export async function archivarTeamAction(teamId: string): Promise<void> {
  await api.post(`/sports-hub/teams/${teamId}/archive`);
  revalidatePath('/sports-hub/teams');
}
