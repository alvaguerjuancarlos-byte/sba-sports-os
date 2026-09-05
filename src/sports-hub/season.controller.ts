import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { SeasonService } from './season.service.js';
import type { SeasonStatus } from './sports-hub.types.js';

// UC-SPT-01 — Actor: Admin de organización.
@Controller('sports-hub/seasons')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director')
export class SeasonController {
  constructor(private readonly seasonService: SeasonService) {}

  @Post()
  crear(@CurrentUser() actor: AuthenticatedUser, @Body() body: { name: string; startDate: string; endDate: string }) {
    return this.seasonService.crear({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      name: body.name,
      startDate: body.startDate,
      endDate: body.endDate,
    });
  }

  @Post(':id/close')
  cerrar(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.seasonService.cerrar({ organizationId: actor.organizationId, actorUserId: actor.userId, seasonId: id });
  }

  @Get()
  listar(@CurrentUser() actor: AuthenticatedUser, @Query('status') status?: SeasonStatus) {
    return this.seasonService.listar(actor.organizationId, { status });
  }
}
