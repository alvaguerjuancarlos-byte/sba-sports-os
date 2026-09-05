'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';

export interface AccionState {
  error: string | null;
}

const ESTADO_OK: AccionState = { error: null };

export async function crearVenueAction(_prevState: AccionState, formData: FormData): Promise<AccionState> {
  const name = String(formData.get('name') ?? '').trim();

  try {
    await api.post('/calendar-rsvp/venues', { name });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo crear la sede.' };
  }

  revalidatePath('/calendar/venues');
  return ESTADO_OK;
}

export async function archivarVenueAction(venueId: string): Promise<void> {
  await api.post(`/calendar-rsvp/venues/${venueId}/archive`);
  revalidatePath('/calendar/venues');
}
