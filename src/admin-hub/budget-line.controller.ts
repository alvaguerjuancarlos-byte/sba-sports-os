import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { BudgetLineService } from './budget-line.service.js';

// UC-ADM-01 — Actor: Admin financiero.
@Controller('admin-hub/budget-lines')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director')
export class BudgetLineController {
  constructor(private readonly budgetLineService: BudgetLineService) {}

  @Post()
  crear(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() body: { financialDimensionId: string; season: string; period: string; amountBudgeted: string | number },
  ) {
    return this.budgetLineService.crear({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      financialDimensionId: body.financialDimensionId,
      season: body.season,
      period: body.period,
      amountBudgeted: body.amountBudgeted,
    });
  }

  @Post(':id/archive')
  archivar(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.budgetLineService.archivar({ organizationId: actor.organizationId, actorUserId: actor.userId, budgetLineId: id });
  }
}
