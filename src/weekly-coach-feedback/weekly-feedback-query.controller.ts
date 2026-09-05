import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { WeeklyFeedbackQueryService } from './weekly-feedback-query.service.js';

// UC-WCF-02 — condensado. Sin @Roles: cualquier rol autenticado puede llamar, el scope real
// (staff completo / familia-jugador solo lo propio) se resuelve dentro del servicio.
@Controller('weekly-coach-feedback/players')
@UseGuards(JwtAuthGuard)
export class WeeklyFeedbackQueryController {
  constructor(private readonly queryService: WeeklyFeedbackQueryService) {}

  @Get(':playerId/history')
  consultarHistorico(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('playerId') playerId: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.queryService.consultarHistorico({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      actorRoles: actor.roles,
      playerId,
      desde,
      hasta,
    });
  }
}
