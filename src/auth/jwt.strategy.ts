import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthenticatedUser, JwtClaims } from './jwt.types.js';

// Verificación de firma mínima para desarrollo local — HMAC con JWT_SECRET. Wiring real de
// Auth0/Cognito (JWKS remoto, rotación de llaves, RS256) es un paso posterior explícito, no
// alcance de este dominio (ver CLAUDE.md §Stack, "Auth: Auth0 / Cognito"). No usar JWT_SECRET
// de ejemplo en ningún ambiente real.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET no está definida — ver .env.example.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  // El valor de retorno se convierte en `request.user` — mismo criterio que el resto de Nest.
  validate(payload: JwtClaims): AuthenticatedUser {
    return {
      userId: payload.sub,
      organizationId: payload.org_id,
      roles: payload.roles ?? [],
      mfaVerified: (payload.amr ?? []).includes('mfa'),
    };
  }
}
