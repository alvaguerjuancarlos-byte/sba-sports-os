import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { NotificationService } from './notification.service.js';
import type { NotificationType } from './notification.service.js';

// UC-FAM-02, disparo manual/administrativo — mismo patrón que CollectionsController
// (payments-billing/collections.controller.ts): en producción esto lo llamaría cada módulo de
// origen (factura, RSVP, convocatoria, partido en vivo, galería) internamente vía DI, no un
// endpoint HTTP — ver nota de alcance en la migración 0016 sobre el wiring pendiente.
@Controller('family-communications/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'director')
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @Post()
  crear(@CurrentUser() actor: AuthenticatedUser, @Body() body: { recipientUserId: string; notificationType: NotificationType | string; invoiceId?: string }) {
    return this.service.crear({
      organizationId: actor.organizationId,
      recipientUserId: body.recipientUserId,
      notificationType: body.notificationType,
      invoiceId: body.invoiceId ?? null,
    });
  }
}
