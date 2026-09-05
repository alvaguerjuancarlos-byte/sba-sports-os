import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { BiometricConsentService } from './biometric-consent.service.js';

// UC-ATT-05 — Actor: tutor (si menor) o el propio usuario (si adulto). Sin @Roles (mismo patrón
// que GuardianConsentController) — el gate real vive en BiometricConsentService.
@Controller('attendance-realtime/biometric-consent')
@UseGuards(JwtAuthGuard)
export class BiometricConsentController {
  constructor(private readonly biometricConsentService: BiometricConsentService) {}

  @Post(':userId/grant')
  otorgar(@CurrentUser() actor: AuthenticatedUser, @Param('userId') userId: string) {
    return this.biometricConsentService.otorgar({ organizationId: actor.organizationId, actorUserId: actor.userId, userId });
  }

  @Post(':userId/revoke')
  revocar(@CurrentUser() actor: AuthenticatedUser, @Param('userId') userId: string) {
    return this.biometricConsentService.revocar({ organizationId: actor.organizationId, actorUserId: actor.userId, userId });
  }

  @Get(':userId')
  obtenerEstado(@CurrentUser() actor: AuthenticatedUser, @Param('userId') userId: string) {
    return this.biometricConsentService.obtenerEstado(actor.organizationId, userId);
  }

  // [propuesto] — enrolamiento del template, ver biometric-consent.service.ts.
  @Post(':userId/template')
  registrarTemplate(@CurrentUser() actor: AuthenticatedUser, @Param('userId') userId: string, @Body() body: { providerRef: string }) {
    return this.biometricConsentService.registrarTemplate({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      userId,
      providerRef: body.providerRef,
    });
  }
}
