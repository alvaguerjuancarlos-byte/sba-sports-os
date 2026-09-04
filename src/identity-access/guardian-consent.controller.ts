import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { GuardianConsentService } from './guardian-consent.service.js';

// UC-ID-03 — Actor: Tutor/padre (otorga), Admin (supervisa). Sin restricción de rol específico
// aquí a propósito: cualquier user autenticado puede ser el tutor de un guardian_link — la
// pertenencia real se valida a nivel de negocio (el guardian_link ya referencia guardian_user_id)
// más que a nivel de rol de plataforma.
@Controller('identity/guardian-links')
@UseGuards(JwtAuthGuard)
export class GuardianConsentController {
  constructor(private readonly guardianConsentService: GuardianConsentService) {}

  @Post(':id/grant')
  otorgarConsentimiento(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { privacyNoticeVersion: string },
  ) {
    return this.guardianConsentService.otorgarConsentimiento({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      guardianLinkId: id,
      privacyNoticeVersion: body.privacyNoticeVersion,
    });
  }

  @Post(':id/deny')
  negarConsentimiento(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.guardianConsentService.negarConsentimiento({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      guardianLinkId: id,
    });
  }
}
