import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from './jwt.types.js';

// Extrae request.user (ya poblado por JwtAuthGuard/JwtStrategy) con el tipo correcto, en vez de
// que cada controller le pegue un `any` a `@Req()`.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    return request.user;
  },
);
