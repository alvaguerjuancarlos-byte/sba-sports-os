import { Injectable, type CanActivate, type ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedUser } from './jwt.types.js';

export const ROLES_KEY = 'roles';
// UC-ID-01/02: "Actor: Admin de organización" — decorador para declarar qué roles pueden llamar
// un endpoint. Debe ir después de JwtAuthGuard en la cadena de guards (necesita request.user).
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    return requiredRoles.some((role) => user.roles.includes(role));
  }
}
