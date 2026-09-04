import { describe, expect, it } from 'vitest';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { MfaRequiredGuard } from './mfa-required.guard.js';
import type { AuthenticatedUser } from './jwt.types.js';

function contextoConUsuario(user: AuthenticatedUser): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

const usuario = (roles: string[], mfaVerified: boolean): AuthenticatedUser => ({
  userId: 'user-1',
  organizationId: 'org-1',
  roles,
  mfaVerified,
});

// UC-ID-04 — admin/director y, tras UC-ADM-02, coach también (ver comentario en el guard).
describe('MfaRequiredGuard', () => {
  const guard = new MfaRequiredGuard();

  it('permite pasar a un rol que no requiere MFA (ej. parent) sin importar mfaVerified', () => {
    expect(guard.canActivate(contextoConUsuario(usuario(['parent'], false)))).toBe(true);
  });

  it('bloquea a un admin sin MFA verificado', () => {
    expect(() => guard.canActivate(contextoConUsuario(usuario(['admin'], false)))).toThrow(ForbiddenException);
  });

  it('permite a un admin con MFA verificado', () => {
    expect(guard.canActivate(contextoConUsuario(usuario(['admin'], true)))).toBe(true);
  });

  it('bloquea a un coach sin MFA verificado — UC-ADM-02 le da acceso a Admin Hub', () => {
    expect(() => guard.canActivate(contextoConUsuario(usuario(['coach'], false)))).toThrow(ForbiddenException);
  });

  it('permite a un coach con MFA verificado', () => {
    expect(guard.canActivate(contextoConUsuario(usuario(['coach'], true)))).toBe(true);
  });
});
