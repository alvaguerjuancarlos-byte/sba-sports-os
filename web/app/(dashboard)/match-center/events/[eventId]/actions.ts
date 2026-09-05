'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';
import type { MatchEventType, MatchCardColor } from '@/lib/types/match-center';

export interface AccionState {
  error: string | null;
}

const ESTADO_OK: AccionState = { error: null };

// UC-MAT-01 — agrega un titular a la alineación (uno a la vez); solo se puede alinear a quien
// pasó por Call-up Engine y está 'accepted'.
export async function agregarTitularAction(eventId: string, _prevState: AccionState, formData: FormData): Promise<AccionState> {
  const callupSlotId = String(formData.get('callupSlotId') ?? '');
  const position = String(formData.get('position') ?? '').trim();
  const formationSlot = String(formData.get('formationSlot') ?? '').trim();

  try {
    await api.post(`/match-center/events/${eventId}/lineup`, { titulares: [{ callupSlotId, position, formationSlot }] });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo agregar el titular.' };
  }

  revalidatePath(`/match-center/events/${eventId}`);
  return ESTADO_OK;
}

export async function iniciarPartidoAction(eventId: string): Promise<void> {
  await api.post(`/match-center/events/${eventId}/start`);
  revalidatePath(`/match-center/events/${eventId}`);
}

// UC-MAT-02 — gol/tarjeta/sustitución. La sustitución crea el match_lineup del entrante desde
// cero y desactiva al saliente, todo en el backend.
export async function registrarMatchEventAction(eventId: string, _prevState: AccionState, formData: FormData): Promise<AccionState> {
  const type = String(formData.get('type') ?? '') as MatchEventType;
  const minute = Number(formData.get('minute') ?? 0);
  const playerLineupId = String(formData.get('playerLineupId') ?? '');
  const cardColor = String(formData.get('cardColor') ?? '') as MatchCardColor | '';
  const substituteCallupSlotId = String(formData.get('substituteCallupSlotId') ?? '');
  const substitutePosition = String(formData.get('substitutePosition') ?? '').trim();
  const substituteFormationSlot = String(formData.get('substituteFormationSlot') ?? '').trim();

  try {
    await api.post(`/match-center/events/${eventId}/match-events`, {
      type,
      minute,
      playerLineupId,
      cardColor: cardColor || undefined,
      substituteCallupSlotId: substituteCallupSlotId || undefined,
      substitutePosition: substitutePosition || undefined,
      substituteFormationSlot: substituteFormationSlot || undefined,
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo registrar el evento.' };
  }

  revalidatePath(`/match-center/events/${eventId}`);
  return ESTADO_OK;
}

export async function actualizarMarcadorRivalAction(eventId: string, _prevState: AccionState, formData: FormData): Promise<AccionState> {
  const opponentScore = Number(formData.get('opponentScore') ?? 0);

  try {
    await api.post(`/match-center/events/${eventId}/match-events/opponent-score`, { opponentScore });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo actualizar el marcador rival.' };
  }

  revalidatePath(`/match-center/events/${eventId}`);
  return ESTADO_OK;
}

// UC-MAT-03 — cierre; consolida player_statistic (minutos jugados, goles, tarjetas).
export async function cerrarPartidoAction(eventId: string, _prevState: AccionState, formData: FormData): Promise<AccionState> {
  const finalMinute = Number(formData.get('finalMinute') ?? 0);

  try {
    await api.post(`/match-center/events/${eventId}/close`, { finalMinute });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo cerrar el partido.' };
  }

  revalidatePath(`/match-center/events/${eventId}`);
  return ESTADO_OK;
}
