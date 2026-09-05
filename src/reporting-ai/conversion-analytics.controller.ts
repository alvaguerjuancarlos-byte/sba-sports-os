import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { ConversionAnalyticsService } from './conversion-analytics.service.js';

// UC-CRM-04, condensado — Actor: Staff/admin.
@Controller('reporting-ai/crm/conversion-analytics')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director')
export class ConversionAnalyticsController {
  constructor(private readonly service: ConversionAnalyticsService) {}

  @Get()
  consultar(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.consultar(actor.organizationId);
  }
}
