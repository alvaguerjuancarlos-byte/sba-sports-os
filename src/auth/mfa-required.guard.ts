import { ForbiddenException, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from './jwt.types.js';

// UC-ID-04 — MFA obligatorio para admin/director y cualquier rol con acceso a Admin Hub/Payments;
// opcional para coach; no aplica a menores. Este repo solo construye Identity/Config/Admin Hub/
// Payments (CLAUDE.md), así que "admin/director" cubre el alcance real hoy — ampliar este set si
// se agregan roles financieros específicos en Configuration Studio/Payments más adelante.
//
// Este guard SOLO verifica el claim `amr` del JWT ya verificado (JwtStrategy) — la verificación
// real de que el usuario completó un segundo factor la hace el proveedor externo (Auth0/Cognito)
// al emitir el token, no se reimplementa aquí.
const ROLES_QUE_REQUIEREN_MFA = ['admin', 'director'];

@Injectable()
export class MfaRequiredGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    const requiereMfa = user.roles.some((role) => ROLES_QUE_REQUIEREN_MFA.includes(role));
    if (!requiereMfa) return true;

    if (!user.mfaVerified) {
      throw new ForbiddenException('Este rol requiere autenticación con MFA (UC-ID-04).');
    }
    return true;
  }
}
