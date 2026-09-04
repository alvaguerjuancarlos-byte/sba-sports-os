import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { FinancialDimensionsService } from './financial-dimensions.service.js';
import type { CfgStatus, DimensionType } from './configuration-studio.types.js';

// UC-CFG-01 — Actor: Admin financiero. Alimenta Admin Hub (budget_line) — mismo nivel de
// sensibilidad que Identity & Access, mismos guards (admin/director + MFA).
@Controller('config/financial-dimensions')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director')
export class FinancialDimensionsController {
  constructor(private readonly financialDimensionsService: FinancialDimensionsService) {}

  @Post()
  crear(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() body: { type: DimensionType; name: string; parentId?: string },
  ) {
    return this.financialDimensionsService.crear({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      type: body.type,
      name: body.name,
      parentId: body.parentId ?? null,
    });
  }

  @Post(':id/archive')
  archivar(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.financialDimensionsService.archivar({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      dimensionId: id,
    });
  }

  @Get()
  listar(@CurrentUser() actor: AuthenticatedUser, @Query('status') status?: CfgStatus) {
    return this.financialDimensionsService.listar(actor.organizationId, { status });
  }

  // UC-PAY-05 — marca qué tipo de cargo vencido bloquea convocatoria. No es parte de UC-CFG-01..04
  // pero vive aquí porque Configuration Studio es dueño de financial_dimension.
  @Post(':id/qualifying-for-block')
  actualizarQualifyingForBlock(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { isQualifyingForBlock: boolean },
  ) {
    return this.financialDimensionsService.actualizarQualifyingForBlock({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      dimensionId: id,
      isQualifyingForBlock: body.isQualifyingForBlock,
    });
  }
}
