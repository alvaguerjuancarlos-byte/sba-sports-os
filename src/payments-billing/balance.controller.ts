import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { BalanceQueryService } from './balance-query.service.js';

// UC-PAY-07 — Actor: "Familia (vista propia) o Admin (vista de cualquier cuenta con permiso)" —
// sin @Roles a nivel de ruta a propósito (mismo patrón que GuardianConsentController): el gate
// real de "vista propia vs. admin" vive en BalanceQueryService, no aquí.
@Controller('payments/balance')
@UseGuards(JwtAuthGuard)
export class BalanceController {
  constructor(private readonly balanceQueryService: BalanceQueryService) {}

  @Get(':athleteUserId')
  consultar(@CurrentUser() actor: AuthenticatedUser, @Param('athleteUserId') athleteUserId: string) {
    return this.balanceQueryService.consultar({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      actorRoles: actor.roles,
      athleteUserId,
    });
  }
}
