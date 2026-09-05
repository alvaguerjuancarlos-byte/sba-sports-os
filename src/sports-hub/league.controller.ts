import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { LeagueService } from './league.service.js';

// UC-SPT-04 — Actor: Admin de organización o de competencia.
@Controller('sports-hub/league-cups')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director')
export class LeagueController {
  constructor(private readonly leagueService: LeagueService) {}

  @Post()
  crear(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() body: { seasonId: string; name: string; format: string; rules?: Record<string, unknown>; teamIds: string[] },
  ) {
    return this.leagueService.crear({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      seasonId: body.seasonId,
      name: body.name,
      format: body.format,
      rules: body.rules ?? null,
      teamIds: body.teamIds,
    });
  }

  // UC-SPT-05 — "cualquier rol con visibilidad del equipo" — se sobreescribe @Roles a nivel de
  // método con los 5 roles existentes (equivalente a "cualquier rol autenticado"), en vez de dejar
  // el @Roles('admin','director') de la clase, que sí restringiría esta consulta de solo lectura.
  @Get(':id/standings')
  @Roles('player', 'coach', 'admin', 'parent', 'director')
  consultarHistorial(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.leagueService.consultarHistorial(actor.organizationId, id);
  }
}
