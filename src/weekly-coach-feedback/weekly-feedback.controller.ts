import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { WeeklyFeedbackService } from './weekly-feedback.service.js';
import type { EntradaFeedbackJugador } from './weekly-coach-feedback.types.js';

// UC-WCF-01 — Actor: Coach.
@Controller('weekly-coach-feedback')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director', 'coach')
export class WeeklyFeedbackController {
  constructor(private readonly weeklyFeedbackService: WeeklyFeedbackService) {}

  @Post('batches')
  capturarLote(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() body: { teamId: string; weekEnding: string; entradas: EntradaFeedbackJugador[] },
  ) {
    return this.weeklyFeedbackService.capturarLote({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      teamId: body.teamId,
      weekEnding: body.weekEnding,
      entradas: body.entradas,
    });
  }
}
