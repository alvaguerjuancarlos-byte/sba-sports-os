import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { CallupQueryService } from './callup-query.service.js';

// UC-CUP-05 — Sin @Roles (el filtrado familia/jugador vs. coach/admin ocurre dentro del servicio).
@Controller('callup-engine/events')
@UseGuards(JwtAuthGuard)
export class CallupQueryController {
  constructor(private readonly callupQueryService: CallupQueryService) {}

  @Get(':eventId/callup')
  consultar(@CurrentUser() actor: AuthenticatedUser, @Param('eventId') eventId: string) {
    return this.callupQueryService.consultarPorEvento({
      organizationId: actor.organizationId,
      eventId,
      actorUserId: actor.userId,
      actorRoles: actor.roles,
    });
  }
}
