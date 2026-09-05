import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { MatchQueryService } from './match-query.service.js';

// UC-MAT-04/05 — "familia o espectador con acceso" / "cualquier rol con visibilidad" — sin
// @Roles, solo autenticación.
@Controller('match-center')
@UseGuards(JwtAuthGuard)
export class MatchQueryController {
  constructor(private readonly matchQueryService: MatchQueryService) {}

  @Get('events/:eventId/live')
  consultarEnVivo(@Param('eventId') eventId: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.matchQueryService.consultarEnVivo(actor.organizationId, eventId);
  }

  @Get('events/:eventId/statistics')
  consultarEstadisticasDePartido(@Param('eventId') eventId: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.matchQueryService.consultarEstadisticasDePartido(actor.organizationId, eventId);
  }

  @Get('users/:userId/statistics')
  consultarEstadisticasDeJugador(@Param('userId') userId: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.matchQueryService.consultarEstadisticasDeJugador(actor.organizationId, userId);
  }
}
