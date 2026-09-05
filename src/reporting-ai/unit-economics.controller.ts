import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { UnitEconomicsService } from './unit-economics.service.js';
import type { UnidadDeAnalisis } from './unit-economics.service.js';

// UC-RPT-03 — Actor: Director/admin ejecutivo.
@Controller('reporting-ai/unit-economics')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director')
export class UnitEconomicsController {
  constructor(private readonly service: UnitEconomicsService) {}

  @Get()
  consultar(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('unit') unit: UnidadDeAnalisis,
    @Query('unitRef') unitRef: string,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
  ) {
    return this.service.consultar({ organizationId: actor.organizationId, unit, unitRef, desde, hasta });
  }
}
