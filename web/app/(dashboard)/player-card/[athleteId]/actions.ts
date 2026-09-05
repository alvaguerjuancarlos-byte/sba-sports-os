'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';
import type { AthleteMedicalNoteType } from '@/lib/types/player-card';

export interface AccionState {
  error: string | null;
}

const ESTADO_OK: AccionState = { error: null };

// UC-PLC-02 — restringido a admin/director en el backend (sin entidad de "scope médico
// autorizado" para coach todavía).
export async function registrarNotaMedicaAction(athleteId: string, _prevState: AccionState, formData: FormData): Promise<AccionState> {
  const noteType = String(formData.get('noteType') ?? '') as AthleteMedicalNoteType;
  const description = String(formData.get('description') ?? '').trim();

  try {
    await api.post(`/player-card/athletes/${athleteId}/medical-notes`, { noteType, description });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo registrar la nota médica.' };
  }

  revalidatePath(`/player-card/${athleteId}`);
  return ESTADO_OK;
}

export async function registrarNotaNutricionalAction(athleteId: string, _prevState: AccionState, formData: FormData): Promise<AccionState> {
  const note = String(formData.get('note') ?? '').trim();

  try {
    await api.post(`/player-card/athletes/${athleteId}/nutrition-notes`, { note });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo registrar la nota nutricional.' };
  }

  revalidatePath(`/player-card/${athleteId}`);
  return ESTADO_OK;
}
