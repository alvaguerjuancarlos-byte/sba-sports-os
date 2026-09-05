'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';

export async function registrarAsistenciaAction(employeeId: string): Promise<void> {
  await api.post(`/hr-coach-hub/employees/${employeeId}/attendance`);
  revalidatePath('/hr-coach-hub/my-development');
}
