import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { CoachDevelopmentSummaryService } from './coach-development-summary.service.js';

// UC-HR-05, condensado — Actor: Director técnico/HR (o el propio coach, resuelto en el servicio).
@Controller('hr-coach-hub/employees/:employeeId/development-summary')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director', 'coach')
export class CoachDevelopmentSummaryController {
  constructor(private readonly service: CoachDevelopmentSummaryService) {}

  @Get()
  consultar(@CurrentUser() actor: AuthenticatedUser, @Param('employeeId') employeeId: string) {
    return this.service.consultar({ organizationId: actor.organizationId, actorUserId: actor.userId, actorRoles: actor.roles, employeeId });
  }
}
