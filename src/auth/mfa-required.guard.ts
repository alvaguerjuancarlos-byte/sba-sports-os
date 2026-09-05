import { ForbiddenException, Injectable, SetMetadata, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedUser } from './jwt.types.js';

export const MFA_ROLES_KEY = 'mfaRoles';

// UC-ID-04 — "MFA obligatorio para admin/director y cualquier rol con acceso a Admin Hub/Payments;
// opcional para coach" [en cualquier otro contexto]. admin/director requieren MFA en TODA ruta
// protegida por este guard (lista por defecto); un rol que solo se vuelve sensible en una ruta
// puntual (ej. coach en UC-ADM-02: capturar una purchase_request) se agrega con este decorador
// SOLO ahí — Sports Hub también permite a coach crear equipos/roster (UC-SPT-02/03), y ahí sí debe
// seguir siendo opcional, así que la lista no puede ser un set global fijo.
export const RequireMfaFor = (...roles: string[]) => SetMetadata(MFA_ROLES_KEY, roles);

const ROLES_QUE_REQUIEREN_MFA_POR_DEFECTO = ['admin', 'director'];

// Este guard SOLO verifica el claim `amr` del JWT ya verificado (JwtStrategy) — la verificación
// real de que el usuario completó un segundo factor la hace el proveedor externo (Auth0/Cognito)
// al emitir el token, no se reimplementa aquí.
@Injectable()
export class MfaRequiredGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesQueRequierenMfa =
      this.reflector.getAllAndOverride<string[] | undefined>(MFA_ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? ROLES_QUE_REQUIEREN_MFA_POR_DEFECTO;

    const { user } = context.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    const requiereMfa = user.roles.some((role) => rolesQueRequierenMfa.includes(role));
    if (!requiereMfa) return true;

    if (!user.mfaVerified) {
      throw new ForbiddenException('Este rol requiere autenticación con MFA (UC-ID-04).');
    }
    return true;
  }
}
