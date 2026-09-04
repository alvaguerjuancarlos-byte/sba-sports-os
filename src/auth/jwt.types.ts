// Forma del JWT que este repo CONSUME — no lo EMITE. La integración real con el proveedor de
// identidad (Auth0/Cognito, CLAUDE.md §Stack) es un paso posterior explícito: login, enrolamiento
// de MFA y emisión del token viven ahí. Aquí solo se verifica la firma y se leen estos claims.
export interface JwtClaims {
  sub: string; // user.id
  org_id: string; // organization.id — el tenant activo de esta sesión
  roles: string[]; // valores de tenant_role para user_tenant_role en org_id
  amr?: string[]; // Authentication Methods Reference (claim estándar OIDC) — incluye 'mfa' si el login usó segundo factor
}

// Lo que los guards/decoradores de este dominio exponen en `request.user` — mismo shape que
// JwtClaims, renombrado a camelCase consistente con el resto del código.
export interface AuthenticatedUser {
  userId: string;
  organizationId: string;
  roles: string[];
  mfaVerified: boolean;
}
