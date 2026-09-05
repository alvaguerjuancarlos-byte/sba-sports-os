import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { FamilyPanelService } from './family-panel.service.js';

// UC-FAM-01 — Actor: Familia/tutor. Sin @Roles: cualquier rol autenticado puede llamar — un
// actor sin ningún guardian_link simplemente recibe un panel vacío (sin atletas que ensamblar).
@Controller('family-communications/panel')
@UseGuards(JwtAuthGuard)
export class FamilyPanelController {
  constructor(private readonly service: FamilyPanelService) {}

  @Get()
  consultar(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.consultar({ organizationId: actor.organizationId, actorUserId: actor.userId, actorRoles: actor.roles });
  }
}
