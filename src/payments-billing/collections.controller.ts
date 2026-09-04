import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { CollectionsService } from './collections.service.js';

// UC-PAY-06 — disparo manual/administrativo del ciclo de recordatorios. En producción esto lo
// llamaría un scheduler, no un admin a mano — ver comentario en CollectionsService.
@Controller('payments/collections')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Post('reminders')
  generarRecordatorios(@CurrentUser() actor: AuthenticatedUser) {
    return this.collectionsService.generarRecordatorios(actor.organizationId);
  }
}
