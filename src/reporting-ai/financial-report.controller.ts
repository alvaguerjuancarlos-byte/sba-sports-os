import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { FinancialReportService } from './financial-report.service.js';
import { ExportService } from './export.service.js';

// UC-RPT-02 — Actor: Admin financiero/director. UC-RPT-04 (export CSV) del mismo reporte.
@Controller('reporting-ai/financial-report')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director')
export class FinancialReportController {
  constructor(
    private readonly financialReportService: FinancialReportService,
    private readonly exportService: ExportService,
  ) {}

  @Get()
  generar(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('season') season?: string,
    @Query('period') period?: string,
    @Query('periodStartDate') periodStartDate?: string,
    @Query('periodEndDate') periodEndDate?: string,
  ) {
    return this.financialReportService.generar({ organizationId: actor.organizationId, season, period, periodStartDate, periodEndDate });
  }

  @Get('export.csv')
  async exportarCsv(
    @CurrentUser() actor: AuthenticatedUser,
    @Res() res: Response,
    @Query('season') season?: string,
    @Query('period') period?: string,
  ) {
    const csv = await this.exportService.exportarReporteFinancieroCsv({ organizationId: actor.organizationId, season, period });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte-financiero.csv"');
    res.send(csv);
  }
}
