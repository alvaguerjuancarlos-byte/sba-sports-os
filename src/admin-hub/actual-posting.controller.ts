import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { ActualPostingService } from './actual-posting.service.js';

// UC-ADM-05 — Actor: Admin financiero.
@Controller('admin-hub/actual-postings')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director')
export class ActualPostingController {
  constructor(private readonly actualPostingService: ActualPostingService) {}

  @Post()
  registrar(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() body: { purchaseOrderId: string; amount: string | number; postedAt?: string },
  ) {
    return this.actualPostingService.registrar({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      purchaseOrderId: body.purchaseOrderId,
      amount: body.amount,
      postedAt: body.postedAt ? new Date(body.postedAt) : null,
    });
  }
}
