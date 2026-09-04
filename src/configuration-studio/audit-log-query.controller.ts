import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { AuditLogQueryService } from './audit-log-query.service.js';

// UC-CFG-04 — Consultar log de auditoría de cambios. Solo lectura.
@Controller('config/audit-log')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director')
export class AuditLogQueryController {
  constructor(private readonly auditLogQueryService: AuditLogQueryService) {}

  @Get()
  consultar(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('entityType') entityType?: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.auditLogQueryService.consultar({
      organizationId: actor.organizationId,
      entityType,
      actorUserId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }
}
