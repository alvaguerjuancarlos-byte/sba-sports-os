import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { CoachObjectiveService } from './coach-objective.service.js';
import type { CoachObjectiveStatus } from './hr-coach-hub.types.js';

// UC-HR-04 — Actor: Admin de HR/director técnico (define); coach (consulta/reporta avance).
@Controller('hr-coach-hub/employees/:employeeId/objectives')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director', 'coach')
export class CoachObjectiveController {
  constructor(private readonly service: CoachObjectiveService) {}

  @Post()
  @Roles('admin', 'director')
  definir(@CurrentUser() actor: AuthenticatedUser, @Param('employeeId') employeeId: string, @Body() body: { period: string; objectiveText: string }) {
    return this.service.definir({ organizationId: actor.organizationId, actorUserId: actor.userId, employeeId, period: body.period, objectiveText: body.objectiveText });
  }

  @Post(':objectiveId/status')
  actualizarStatus(@CurrentUser() actor: AuthenticatedUser, @Param('objectiveId') objectiveId: string, @Body() body: { status: CoachObjectiveStatus }) {
    return this.service.actualizarStatus({ organizationId: actor.organizationId, actorUserId: actor.userId, coachObjectiveId: objectiveId, status: body.status });
  }

  @Get()
  consultar(@CurrentUser() actor: AuthenticatedUser, @Param('employeeId') employeeId: string) {
    return this.service.consultarPorEmpleado({ organizationId: actor.organizationId, actorUserId: actor.userId, actorRoles: actor.roles, employeeId });
  }
}
