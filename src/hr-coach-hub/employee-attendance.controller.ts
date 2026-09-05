import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { EmployeeAttendanceService } from './employee-attendance.service.js';

// UC-HR-02, condensado — Actor: Admin de HR o el mismo employee.
@Controller('hr-coach-hub/employees/:employeeId/attendance')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director', 'coach')
export class EmployeeAttendanceController {
  constructor(private readonly service: EmployeeAttendanceService) {}

  @Post()
  registrar(@CurrentUser() actor: AuthenticatedUser, @Param('employeeId') employeeId: string) {
    return this.service.registrar({ organizationId: actor.organizationId, actorUserId: actor.userId, employeeId });
  }

  @Get()
  listar(@CurrentUser() actor: AuthenticatedUser, @Param('employeeId') employeeId: string) {
    return this.service.listarPorEmpleado(actor.organizationId, employeeId);
  }
}
