import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { MediaConsentService } from './media-consent.service.js';

// UC-PLC-03 — sin @Roles: la autorización real (propio usuario o tutor) la resuelve el servicio.
@Controller('player-card/media-consent/:userId')
@UseGuards(JwtAuthGuard)
export class MediaConsentController {
  constructor(private readonly service: MediaConsentService) {}

  @Post('grant')
  otorgar(@CurrentUser() actor: AuthenticatedUser, @Param('userId') userId: string) {
    return this.service.otorgar({ organizationId: actor.organizationId, actorUserId: actor.userId, userId });
  }

  @Post('revoke')
  revocar(@CurrentUser() actor: AuthenticatedUser, @Param('userId') userId: string) {
    return this.service.revocar({ organizationId: actor.organizationId, actorUserId: actor.userId, userId });
  }

  @Get()
  obtenerEstado(@CurrentUser() actor: AuthenticatedUser, @Param('userId') userId: string) {
    return this.service.obtenerEstado(actor.organizationId, userId);
  }
}
