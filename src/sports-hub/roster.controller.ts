import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { RosterService } from './roster.service.js';
import type { RosterMembershipStatus, RosterRole } from './sports-hub.types.js';

// UC-SPT-03 — Actor: Coach o admin con permiso sobre el equipo.
@Controller('sports-hub/teams/:teamId/roster')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director', 'coach')
export class RosterController {
  constructor(private readonly rosterService: RosterService) {}

  @Post()
  crear(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('teamId') teamId: string,
    @Body()
    body: { userId: string; role: RosterRole; jerseyNumber?: number; position?: string; confirmDualMembership?: boolean },
  ) {
    return this.rosterService.crear({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      teamId,
      userId: body.userId,
      role: body.role,
      jerseyNumber: body.jerseyNumber ?? null,
      position: body.position ?? null,
      confirmDualMembership: body.confirmDualMembership ?? false,
    });
  }

  @Post(':membershipId/deactivate')
  desactivar(@CurrentUser() actor: AuthenticatedUser, @Param('membershipId') membershipId: string) {
    return this.rosterService.desactivar({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      rosterMembershipId: membershipId,
    });
  }

  @Get()
  listar(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('teamId') teamId: string,
    @Query('status') status?: RosterMembershipStatus,
  ) {
    return this.rosterService.listarPorEquipo(actor.organizationId, teamId, { status });
  }
}
