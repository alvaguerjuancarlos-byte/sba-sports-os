import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { NotificationQueryService } from './notification-query.service.js';

// UC-FAM-02, paso 4 — bandeja in-app. Sin @Roles: cualquier rol autenticado consulta/gestiona su
// PROPIA bandeja (filtrada por recipient_user_id = actor, nunca por parámetro de otro usuario).
@Controller('family-communications/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationQueryController {
  constructor(private readonly service: NotificationQueryService) {}

  @Get('inbox')
  listarBandeja(@CurrentUser() actor: AuthenticatedUser, @Query('soloNoLeidas') soloNoLeidas?: string) {
    return this.service.listarBandeja(actor.organizationId, actor.userId, { soloNoLeidas: soloNoLeidas === 'true' });
  }

  @Post(':id/read')
  marcarLeida(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.service.marcarLeida(actor.organizationId, actor.userId, id);
  }

  @Post(':id/dismiss')
  descartar(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.service.descartar(actor.organizationId, actor.userId, id);
  }
}
