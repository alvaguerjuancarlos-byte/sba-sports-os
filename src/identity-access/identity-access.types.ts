// Tipos de fila — reflejan exactamente db/migrations/0001_identity_access_init.sql. Sin ORM no
// hay generación automática de tipos; se mantienen a mano junto a la migración que los define.

export type TenantRole = 'player' | 'coach' | 'admin' | 'parent' | 'director';
export type TenantRoleStatus = 'pending' | 'active' | 'revoked';
export type ConsentStatus = 'requested' | 'granted' | 'revoked';

export interface UserRow {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string; // date de Postgres llega como string 'YYYY-MM-DD'
  created_at: string;
  updated_at: string;
}

export interface UserTenantRoleRow {
  id: string;
  organization_id: string;
  user_id: string;
  role: TenantRole;
  status: TenantRoleStatus;
  mfa_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface GuardianLinkRow {
  id: string;
  organization_id: string;
  guardian_user_id: string;
  athlete_user_id: string;
  consent_status: ConsentStatus;
  consent_captured_at: string | null;
  privacy_notice_version: string | null;
  created_at: string;
  updated_at: string;
}

// Fila combinada para pantallas de administración (ej. frontend, listado de usuarios) — un
// user_tenant_role con los datos del user ya resueltos, para no obligar a un segundo viaje por
// cada fila. [propuesto]: no hay UC-ID literal que pida esta forma exacta, pero sin ella no hay
// manera de listar "las personas de esta organización" sin N+1 consultas.
export interface UsuarioDeOrganizacionRow {
  user_tenant_role_id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string;
  role: TenantRole;
  status: TenantRoleStatus;
}

// Edad de mayoría de edad para efectos de esta plataforma — LFPDPPP/legislación mexicana general
// (arquitectura §7.1, marco regulatorio primario). No está como número explícito en los
// documentos de Fase 2 leídos — [propuesto], mismo criterio del diccionario de datos para
// campos sin especificar literal.
const EDAD_MAYORIA_DE_EDAD = 18;

// UC-ID-01 paso 2: "el sistema calcula si la persona es menor de edad a partir de la fecha de
// nacimiento" — nunca se captura a mano (diccionario: user.is_minor es calculado, no columna).
export function calcularEsMenorDeEdad(dateOfBirth: Date, ahora: Date = new Date()): boolean {
  let edad = ahora.getFullYear() - dateOfBirth.getFullYear();
  const noHaCumplidoAnosEsteAno =
    ahora.getMonth() < dateOfBirth.getMonth() ||
    (ahora.getMonth() === dateOfBirth.getMonth() && ahora.getDate() < dateOfBirth.getDate());
  if (noHaCumplidoAnosEsteAno) edad--;
  return edad < EDAD_MAYORIA_DE_EDAD;
}
