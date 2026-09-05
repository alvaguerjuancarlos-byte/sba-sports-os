'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';

export async function marcarLeidaAction(notificationId: string): Promise<void> {
  await api.post(`/family-communications/notifications/${notificationId}/read`);
  revalidatePath('/family/notifications');
}

export async function descartarAction(notificationId: string): Promise<void> {
  await api.post(`/family-communications/notifications/${notificationId}/dismiss`);
  revalidatePath('/family/notifications');
}
