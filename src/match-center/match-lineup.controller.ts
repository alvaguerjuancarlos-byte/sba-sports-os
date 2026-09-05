import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { MatchLineupService } from './match-lineup.service.js';
import type { TitularInput } from './match-lineup.service.js';

// UC-MAT-01 — Actor: Coach.
@Controller('match-center/events/:eventId')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director', 'coach')
export class MatchLineupController {
  constructor(private readonly matchLineupService: MatchLineupService) {}

  @Post('lineup')
  asignarAlineacion(@CurrentUser() actor: AuthenticatedUser, @Param('eventId') eventId: string, @Body() body: { titulares: TitularInput[] }) {
    return this.matchLineupService.asignarAlineacion({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      eventId,
      titulares: body.titulares,
    });
  }

  @Post('start')
  iniciarPartido(@CurrentUser() actor: AuthenticatedUser, @Param('eventId') eventId: string) {
    return this.matchLineupService.iniciarPartido({ organizationId: actor.organizationId, actorUserId: actor.userId, eventId });
  }

  // Lectura abierta a cualquier rol autenticado (mismo criterio que UC-MAT-04/05) — quién está en
  // la alineación no es dato restringido.
  @Get('lineup')
  @Roles('player', 'coach', 'admin', 'parent', 'director')
  listar(@CurrentUser() actor: AuthenticatedUser, @Param('eventId') eventId: string) {
    return this.matchLineupService.listarPorEvento(actor.organizationId, eventId);
  }
}
