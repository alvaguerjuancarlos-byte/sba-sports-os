import { describe, expect, it } from 'vitest';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { MfaRequiredGuard } from './mfa-required.guard.js';
import type { AuthenticatedUser } from './jwt.types.js';

function contextoConUsuario(user: AuthenticatedUser): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function reflectorFalso(metadata: string[] | undefined): Reflector {
  return { getAllAndOverride: () => metadata } as unknown as Reflector;
}

const usuario = (roles: string[], mfaVerified: boolean): AuthenticatedUser => ({
  userId: 'user-1',
  organizationId: 'org-1',
  roles,
  mfaVerified,
});

// UC-ID-04 — admin/director requieren MFA en toda ruta (lista por defecto, sin metadata); un rol
// adicional (ej. coach en UC-ADM-02) solo lo requiere si la ruta lo declara con @RequireMfaFor.
describe('MfaRequiredGuard', () => {
  it('sin metadata en la ruta, permite pasar a un rol que no requiere MFA por defecto (ej. parent)', () => {
    const guard = new MfaRequiredGuard(reflectorFalso(undefined));
    expect(guard.canActivate(contextoConUsuario(usuario(['parent'], false)))).toBe(true);
  });

  it('sin metadata en la ruta, bloquea a un admin sin MFA verificado (lista por defecto)', () => {
    const guard = new MfaRequiredGuard(reflectorFalso(undefined));
    expect(() => guard.canActivate(contextoConUsuario(usuario(['admin'], false)))).toThrow(ForbiddenException);
  });

  it('sin metadata en la ruta, permite a un admin con MFA verificado', () => {
    const guard = new MfaRequiredGuard(reflectorFalso(undefined));
    expect(guard.canActivate(contextoConUsuario(usuario(['admin'], true)))).toBe(true);
  });

  it('sin metadata en la ruta, un coach NUNCA requiere MFA (opcional por defecto, UC-ID-04)', () => {
    const guard = new MfaRequiredGuard(reflectorFalso(undefined));
    expect(guard.canActivate(contextoConUsuario(usuario(['coach'], false)))).toBe(true);
  });

  it('con @RequireMfaFor(...,"coach") en la ruta, bloquea a un coach sin MFA verificado (UC-ADM-02)', () => {
    const guard = new MfaRequiredGuard(reflectorFalso(['admin', 'director', 'coach']));
    expect(() => guard.canActivate(contextoConUsuario(usuario(['coach'], false)))).toThrow(ForbiddenException);
  });

  it('con @RequireMfaFor(...,"coach") en la ruta, permite a un coach con MFA verificado', () => {
    const guard = new MfaRequiredGuard(reflectorFalso(['admin', 'director', 'coach']));
    expect(guard.canActivate(contextoConUsuario(usuario(['coach'], true)))).toBe(true);
  });
});
