import { ForbiddenException, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from './jwt.types.js';

// UC-ID-04 — MFA obligatorio para admin/director y cualquier rol con acceso a Admin Hub/Payments;
// opcional para coach en su rol normal, pero UC-ADM-02 explícitamente permite a un coach capturar
// una purchase_request (actor: "coach, staff, admin de área") — ese único punto de contacto de
// coach con una ruta protegida por este guard es exactamente el caso que "cualquier rol con acceso
// a Admin Hub" cubre, así que coach entra a esta lista. No afecta a Identity & Access: ahí ninguna
// ruta con este guard permite el rol coach vía @Roles, así que este cambio es un no-op para ese
// dominio y solo entra en efecto en las rutas de Admin Hub que sí lo permiten.
//
// Este guard SOLO verifica el claim `amr` del JWT ya verificado (JwtStrategy) — la verificación
// real de que el usuario completó un segundo factor la hace el proveedor externo (Auth0/Cognito)
// al emitir el token, no se reimplementa aquí.
const ROLES_QUE_REQUIEREN_MFA = ['admin', 'director', 'coach'];

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
