'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';
import type { RosterRole } from '@/lib/types/sports-hub';

export interface AccionState {
  error: string | null;
}

const ESTADO_OK: AccionState = { error: null };

// UC-SPT-03 — incorporar a alguien al roster. Doble militancia (mismo deporte/temporada, otro
// equipo) requiere confirmación explícita — sin ella, el backend responde 409 con el detalle.
export async function crearRosterMembershipAction(teamId: string, _prevState: AccionState, formData: FormData): Promise<AccionState> {
  const userId = String(formData.get('userId') ?? '');
  const role = String(formData.get('role') ?? '') as RosterRole;
  const jerseyNumber = String(formData.get('jerseyNumber') ?? '').trim();
  const position = String(formData.get('position') ?? '').trim();
  const confirmDualMembership = formData.get('confirmDualMembership') === 'on';

  try {
    await api.post(`/sports-hub/teams/${teamId}/roster`, {
      userId,
      role,
      jerseyNumber: jerseyNumber ? Number(jerseyNumber) : undefined,
      position: position || undefined,
      confirmDualMembership,
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo incorporar al roster.' };
  }

  revalidatePath(`/sports-hub/teams/${teamId}`);
  return ESTADO_OK;
}

export async function desactivarRosterMembershipAction(teamId: string, membershipId: string): Promise<void> {
  await api.post(`/sports-hub/teams/${teamId}/roster/${membershipId}/deactivate`);
  revalidatePath(`/sports-hub/teams/${teamId}`);
}
