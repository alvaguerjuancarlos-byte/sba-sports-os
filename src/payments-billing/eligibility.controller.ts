import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { EligibilityService } from './eligibility.service.js';

// UC-PAY-05 — Servicio interno, contrato sugerido por el diccionario de datos:
// GET /internal/payments/eligibility/:athlete_user_id → { eligible, blocking_invoice_id?, payment_link? }
// Se expone como ruta HTTP normal (admin/director) porque Call-up Engine, su consumidor real, no
// existe todavía en este repo — cuando exista, la autenticación service-to-service (sin JWT de
// usuario) es una decisión aparte.
@Controller('internal/payments/eligibility')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director')
export class EligibilityController {
  constructor(private readonly eligibilityService: EligibilityService) {}

  @Get(':athleteUserId')
  consultar(@CurrentUser() actor: AuthenticatedUser, @Param('athleteUserId') athleteUserId: string) {
    return this.eligibilityService.consultar({ organizationId: actor.organizationId, athleteUserId });
  }
}
