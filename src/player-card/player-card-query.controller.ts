import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { PlayerCardQueryService } from './player-card-query.service.js';

// UC-PLC-01 — sin @Roles: cualquier rol autenticado puede llamar, el scope real (qué secciones se
// ven, o si se deniega la card completa) lo resuelve el servicio.
@Controller('player-card/athletes')
@UseGuards(JwtAuthGuard)
export class PlayerCardQueryController {
  constructor(private readonly service: PlayerCardQueryService) {}

  @Get(':athleteId')
  consultar(@CurrentUser() actor: AuthenticatedUser, @Param('athleteId') athleteId: string) {
    return this.service.consultar({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      actorRoles: actor.roles,
      athleteUserId: athleteId,
    });
  }
}
