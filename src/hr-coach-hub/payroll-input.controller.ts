import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { PayrollInputService } from './payroll-input.service.js';

// UC-HR-03 — Actor: Admin de HR/financiero. Dato restringido de HR/financiero.
@Controller('hr-coach-hub/employees/:employeeId/payroll-inputs')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director')
export class PayrollInputController {
  constructor(private readonly service: PayrollInputService) {}

  @Post()
  capturar(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
    @Body() body: { period: string; hours?: number; bonuses?: number; deductionsNotes?: string },
  ) {
    return this.service.capturar({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      employeeId,
      period: body.period,
      hours: body.hours ?? null,
      bonuses: body.bonuses,
      deductionsNotes: body.deductionsNotes ?? null,
    });
  }

  @Get()
  listar(@CurrentUser() actor: AuthenticatedUser, @Param('employeeId') employeeId: string) {
    return this.service.listarPorEmpleado(actor.organizationId, employeeId);
  }
}
