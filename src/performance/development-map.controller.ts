import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { DevelopmentMapService } from './development-map.service.js';

interface RangoBody {
  dateRangeStart: string;
  dateRangeEnd: string;
}

// UC-PRF-01/02/04 — Actor: "Sistema (agrega); coach/admin(/director) (consume)".
@Controller('performance/development-maps')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director', 'coach')
export class DevelopmentMapController {
  constructor(private readonly service: DevelopmentMapService) {}

  @Post('athletes/:athleteId')
  generarParaAtleta(@CurrentUser() actor: AuthenticatedUser, @Param('athleteId') athleteId: string, @Body() body: RangoBody) {
    return this.service.generarParaAtleta({
      organizationId: actor.organizationId,
      athleteUserId: athleteId,
      dateRangeStart: body.dateRangeStart,
      dateRangeEnd: body.dateRangeEnd,
    });
  }

  @Get('athletes/:athleteId')
  obtenerDeAtleta(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('athleteId') athleteId: string,
    @Query('dateRangeStart') dateRangeStart: string,
    @Query('dateRangeEnd') dateRangeEnd: string,
  ) {
    return this.service.obtener(actor.organizationId, 'athlete', athleteId, dateRangeStart, dateRangeEnd);
  }

  @Post('teams/:teamId')
  generarParaEquipo(@CurrentUser() actor: AuthenticatedUser, @Param('teamId') teamId: string, @Body() body: RangoBody) {
    return this.service.generarParaEquipoOAcademia({
      organizationId: actor.organizationId,
      scope: 'team',
      scopeRefId: teamId,
      dateRangeStart: body.dateRangeStart,
      dateRangeEnd: body.dateRangeEnd,
    });
  }

  @Get('teams/:teamId')
  obtenerDeEquipo(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('teamId') teamId: string,
    @Query('dateRangeStart') dateRangeStart: string,
    @Query('dateRangeEnd') dateRangeEnd: string,
  ) {
    return this.service.obtener(actor.organizationId, 'team', teamId, dateRangeStart, dateRangeEnd);
  }

  // UC-PRF-02: scope='academy' agrega TODOS los equipos activos de la organización —
  // scope_ref_id es el propio organizationId del actor, no un id independiente.
  @Post('academy')
  @Roles('admin', 'director')
  generarParaAcademia(@CurrentUser() actor: AuthenticatedUser, @Body() body: RangoBody) {
    return this.service.generarParaEquipoOAcademia({
      organizationId: actor.organizationId,
      scope: 'academy',
      scopeRefId: actor.organizationId,
      dateRangeStart: body.dateRangeStart,
      dateRangeEnd: body.dateRangeEnd,
    });
  }

  @Get('academy')
  obtenerDeAcademia(@CurrentUser() actor: AuthenticatedUser, @Query('dateRangeStart') dateRangeStart: string, @Query('dateRangeEnd') dateRangeEnd: string) {
    return this.service.obtener(actor.organizationId, 'academy', actor.organizationId, dateRangeStart, dateRangeEnd);
  }
}
