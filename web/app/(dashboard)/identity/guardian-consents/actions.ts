'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';

export async function otorgarAction(guardianLinkId: string, privacyNoticeVersion: string): Promise<void> {
  await api.post(`/identity/guardian-links/${guardianLinkId}/grant`, { privacyNoticeVersion });
  revalidatePath('/identity/guardian-consents');
  revalidatePath('/identity');
}

export async function negarAction(guardianLinkId: string): Promise<void> {
  await api.post(`/identity/guardian-links/${guardianLinkId}/deny`);
  revalidatePath('/identity/guardian-consents');
  revalidatePath('/identity');
}
