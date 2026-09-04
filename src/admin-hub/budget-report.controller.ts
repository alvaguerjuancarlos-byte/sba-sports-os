import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { BudgetReportService } from './budget-report.service.js';

// UC-ADM-07 — Actor: Admin financiero. Solo lectura.
@Controller('admin-hub/budget-vs-actual')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director')
export class BudgetReportController {
  constructor(private readonly budgetReportService: BudgetReportService) {}

  @Get()
  consultar(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('financialDimensionId') financialDimensionId?: string,
    @Query('season') season?: string,
    @Query('period') period?: string,
  ) {
    return this.budgetReportService.consultar({
      organizationId: actor.organizationId,
      financialDimensionId,
      season,
      period,
    });
  }
}
