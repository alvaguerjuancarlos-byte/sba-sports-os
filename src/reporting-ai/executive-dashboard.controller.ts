import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { ExecutiveDashboardService } from './executive-dashboard.service.js';
import { ExecutiveSummaryService } from './executive-summary.service.js';
import type { FiltrosDashboard } from './executive-dashboard.service.js';

// UC-RPT-01 — Actor: Director/admin ejecutivo. UC-RPT-05 (resumen IA) sobre el mismo dashboard.
@Controller('reporting-ai/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director')
export class ExecutiveDashboardController {
  constructor(
    private readonly dashboardService: ExecutiveDashboardService,
    private readonly summaryService: ExecutiveSummaryService,
  ) {}

  @Get()
  consultar(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('teamId') teamId?: string,
    @Query('athleteUserId') athleteUserId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('financialDimensionId') financialDimensionId?: string,
    @Query('sport') sport?: string,
  ) {
    const filtros: FiltrosDashboard = { dateFrom, dateTo, teamId, athleteUserId, employeeId, financialDimensionId, sport };
    return this.dashboardService.consultar(actor.organizationId, filtros);
  }

  @Get('executive-summary')
  consultarResumen(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('teamId') teamId?: string,
    @Query('athleteUserId') athleteUserId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('financialDimensionId') financialDimensionId?: string,
    @Query('sport') sport?: string,
  ) {
    const filtros: FiltrosDashboard = { dateFrom, dateTo, teamId, athleteUserId, employeeId, financialDimensionId, sport };
    return this.summaryService.consultar(actor.organizationId, filtros);
  }
}
