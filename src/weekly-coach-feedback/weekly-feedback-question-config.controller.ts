import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { WeeklyFeedbackQuestionConfigService } from './weekly-feedback-question-config.service.js';

// UC-WCF-01, paso 2 — configuración de las 3 preguntas por deporte. Actor: Admin.
@Controller('weekly-coach-feedback/question-configs')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director')
export class WeeklyFeedbackQuestionConfigController {
  constructor(private readonly service: WeeklyFeedbackQuestionConfigService) {}

  @Post()
  crear(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() body: { sport: string; question1Label: string; question2Label: string; question3Label: string },
  ) {
    return this.service.crear({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      sport: body.sport,
      question1Label: body.question1Label,
      question2Label: body.question2Label,
      question3Label: body.question3Label,
    });
  }

  @Post(':configId/archive')
  archivar(@CurrentUser() actor: AuthenticatedUser, @Param('configId') configId: string) {
    return this.service.archivar({ organizationId: actor.organizationId, actorUserId: actor.userId, configId });
  }

  // Lectura abierta también a coach — UC-WCF-01 paso 2: coach necesita ver las 3 preguntas
  // configuradas para el deporte de su equipo al momento de capturar el feedback semanal, aunque
  // solo admin/director pueda crear/archivar la configuración.
  @Get()
  @Roles('admin', 'director', 'coach')
  listar(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.listar(actor.organizationId);
  }
}
