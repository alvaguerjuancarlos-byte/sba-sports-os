import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { TeamService } from './team.service.js';
import type { TeamStatus } from './sports-hub.types.js';

// UC-SPT-02 — Actor: Admin o coach con permiso. MFA sigue siendo opcional para coach aquí (no es
// Admin Hub/Payments, UC-ID-04) — a diferencia de UC-ADM-02, no se usa @RequireMfaFor.
@Controller('sports-hub/teams')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director', 'coach')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Post()
  crear(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() body: { name: string; category: string; sport: string; seasonId: string },
  ) {
    return this.teamService.crear({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      name: body.name,
      category: body.category,
      sport: body.sport,
      seasonId: body.seasonId,
    });
  }

  @Post(':id/archive')
  archivar(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.teamService.archivar({ organizationId: actor.organizationId, actorUserId: actor.userId, teamId: id });
  }

  // Lectura abierta a cualquier rol autenticado (mismo criterio que UC-SPT-05/standings) — nombre,
  // categoría y deporte de un equipo no son datos restringidos; el calendario (UC-CAL-04) los
  // necesita para mostrarle a cualquier familia/jugador el nombre de su propio equipo.
  @Get()
  @Roles('player', 'coach', 'admin', 'parent', 'director')
  listar(@CurrentUser() actor: AuthenticatedUser, @Query('seasonId') seasonId?: string, @Query('status') status?: TeamStatus) {
    return this.teamService.listar(actor.organizationId, { seasonId, status });
  }
}
