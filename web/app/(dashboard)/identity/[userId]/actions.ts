'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';

export interface AccionState {
  error: string | null;
}

const ESTADO_OK: AccionState = { error: null };

// UC-ID-02 — reusa el user existente, solo agrega un user_tenant_role nuevo.
export async function asignarRolAction(userId: string, _prevState: AccionState, formData: FormData): Promise<AccionState> {
  const role = String(formData.get('role') ?? '');
  const guardianUserId = String(formData.get('guardianUserId') ?? '').trim();

  try {
    await api.post(`/identity/users/${userId}/roles`, { role, guardianUserId: guardianUserId || undefined });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo asignar el rol.' };
  }

  revalidatePath(`/identity/${userId}`);
  revalidatePath('/identity');
  return ESTADO_OK;
}

// UC-ID-05 — cierra el acceso (status=revoked), nunca borra el user ni su historial.
export async function revocarAccesoAction(userTenantRoleId: string, userId: string): Promise<void> {
  await api.post(`/identity/user-tenant-roles/${userTenantRoleId}/revoke`);
  revalidatePath(`/identity/${userId}`);
  revalidatePath('/identity');
}
