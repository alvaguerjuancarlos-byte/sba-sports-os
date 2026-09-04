import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Autenticación base — cualquier endpoint del dominio requiere un JWT válido. Roles/MFA se
// aplican con guards adicionales (roles.guard.ts, mfa-required.guard.ts), no aquí.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
