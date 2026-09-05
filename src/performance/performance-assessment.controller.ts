import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { PerformanceAssessmentService } from './performance-assessment.service.js';

// Actor: Coach. Ver nota de alcance en performance-assessment.service.ts — captura mínima,
// insumo real de UC-PRF-01.
@Controller('performance/assessments')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director', 'coach')
export class PerformanceAssessmentController {
  constructor(private readonly service: PerformanceAssessmentService) {}

  @Post()
  registrar(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() body: { playerId: string; assessmentDate: string; category: string; score: number; notes?: string },
  ) {
    return this.service.registrar({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      playerId: body.playerId,
      assessmentDate: body.assessmentDate,
      category: body.category,
      score: body.score,
      notes: body.notes ?? null,
    });
  }

  // Lectura para el frontend — histórico de evaluaciones capturadas de un jugador (insumo crudo
  // detrás de la dimensión "desempeño" del Development Map).
  @Get(':playerId')
  listar(@Param('playerId') playerId: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.listarPorJugador(actor.organizationId, playerId);
  }
}
