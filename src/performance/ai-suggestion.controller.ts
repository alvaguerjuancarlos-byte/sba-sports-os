import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { AiSuggestionService } from './ai-suggestion.service.js';

// UC-PRF-03 — Actor: Coach/admin.
@Controller('performance/development-maps/athletes/:athleteId/suggestion')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director', 'coach')
export class AiSuggestionController {
  constructor(private readonly service: AiSuggestionService) {}

  @Get()
  consultar(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('athleteId') athleteId: string,
    @Query('dateRangeStart') dateRangeStart: string,
    @Query('dateRangeEnd') dateRangeEnd: string,
  ) {
    return this.service.consultar({ organizationId: actor.organizationId, athleteUserId: athleteId, dateRangeStart, dateRangeEnd });
  }
}
