// Espejo de src/identity-access/identity-access.types.ts (backend) — solo los campos que el
// frontend consume.
export type TenantRole = 'player' | 'coach' | 'admin' | 'parent' | 'director';
export type TenantRoleStatus = 'pending' | 'active' | 'revoked';

export interface UsuarioDeOrganizacion {
  user_tenant_role_id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string;
  role: TenantRole;
  status: TenantRoleStatus;
}

export interface GuardianLink {
  id: string;
  organization_id: string;
  guardian_user_id: string;
  athlete_user_id: string;
  consent_status: 'requested' | 'granted' | 'revoked';
  consent_captured_at: string | null;
  privacy_notice_version: string | null;
  created_at: string;
  updated_at: string;
}
