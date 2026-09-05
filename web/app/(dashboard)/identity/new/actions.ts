'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api, ApiError } from '@/lib/api';

export interface AltaUsuarioState {
  error: string | null;
}

// UC-ID-01 — el Server Action solo reenvía al backend; TODA la validación de negocio (DOB
// obligatoria, menor+player exige guardianUserId, etc.) vive en UsersService, no aquí.
export async function altaUsuarioAction(_prevState: AltaUsuarioState, formData: FormData): Promise<AltaUsuarioState> {
  const fullName = String(formData.get('fullName') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const dateOfBirth = String(formData.get('dateOfBirth') ?? '');
  const role = String(formData.get('role') ?? '');
  const guardianUserId = String(formData.get('guardianUserId') ?? '').trim();

  try {
    await api.post('/identity/users', {
      fullName,
      email: email || undefined,
      phone: phone || undefined,
      dateOfBirth,
      role,
      guardianUserId: guardianUserId || undefined,
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo dar de alta al usuario.' };
  }

  revalidatePath('/identity');
  redirect('/identity');
}
