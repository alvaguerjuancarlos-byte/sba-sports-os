'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';

// UC-CAL-03 — responder RSVP (propio o de un menor bajo guardian_link). Inmutable una vez
// respondido — el backend rechaza un segundo intento sobre el mismo attendance.
export async function responderRsvpAction(attendanceId: string, decision: 'confirmed' | 'declined'): Promise<void> {
  await api.post(`/calendar-rsvp/attendance/${attendanceId}/respond`, { decision });
  revalidatePath('/calendar');
}
