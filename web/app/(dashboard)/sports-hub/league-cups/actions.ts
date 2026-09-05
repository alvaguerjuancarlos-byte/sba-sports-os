'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';

export interface AccionState {
  error: string | null;
}

const ESTADO_OK: AccionState = { error: null };

// UC-SPT-04 — crear liga/copa/torneo. Requiere al menos un equipo participante.
export async function crearLeagueCupAction(_prevState: AccionState, formData: FormData): Promise<AccionState> {
  const seasonId = String(formData.get('seasonId') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const format = String(formData.get('format') ?? '').trim();
  const teamIds = formData.getAll('teamIds').map(String);

  try {
    await api.post('/sports-hub/league-cups', { seasonId, name, format, teamIds });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo crear la competencia.' };
  }

  revalidatePath('/sports-hub/league-cups');
  return ESTADO_OK;
}
