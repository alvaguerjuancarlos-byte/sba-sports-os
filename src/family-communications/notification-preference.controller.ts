import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { NotificationPreferenceService } from './notification-preference.service.js';
import type { NotificationChannel } from './family-communications.types.js';

// UC-FAM-03, condensado — sin @Roles: cada usuario configura sus PROPIAS preferencias.
@Controller('family-communications/notification-preferences')
@UseGuards(JwtAuthGuard)
export class NotificationPreferenceController {
  constructor(private readonly service: NotificationPreferenceService) {}

  @Post()
  configurar(@CurrentUser() actor: AuthenticatedUser, @Body() body: { notificationType: string; channel: Exclude<NotificationChannel, 'in_app'>; enabled: boolean }) {
    return this.service.configurar({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      notificationType: body.notificationType,
      channel: body.channel,
      enabled: body.enabled,
    });
  }

  @Get()
  listar(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.listarPorUsuario(actor.organizationId, actor.userId);
  }
}
