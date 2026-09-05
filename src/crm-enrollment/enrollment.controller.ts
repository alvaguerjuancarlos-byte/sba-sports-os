import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { EnrollmentService } from './enrollment.service.js';
import type { BillingCycle } from '../payments-billing/payments-billing.types.js';

// UC-CRM-03 — Actor: Staff comercial/admin. Toca identidad + facturación — mismo nivel de
// sensibilidad que Payments & Billing (MFA obligatorio).
@Controller('crm-enrollment/prospects/:prospectId')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director')
export class EnrollmentController {
  constructor(private readonly service: EnrollmentService) {}

  @Post('convert')
  convertir(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('prospectId') prospectId: string,
    @Body()
    body: {
      dateOfBirth: string;
      email?: string;
      phone?: string;
      guardianUserId?: string;
      productCatalogId: string;
      currency: string;
      billingCycle: BillingCycle;
    },
  ) {
    return this.service.convertir({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      prospectId,
      dateOfBirth: body.dateOfBirth,
      email: body.email ?? null,
      phone: body.phone ?? null,
      guardianUserId: body.guardianUserId ?? null,
      productCatalogId: body.productCatalogId,
      currency: body.currency,
      billingCycle: body.billingCycle,
    });
  }
}
