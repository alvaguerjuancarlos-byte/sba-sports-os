import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { ProspectService } from './prospect.service.js';
import type { ProspectStage } from './crm-enrollment.types.js';

// UC-CRM-01 — Actor: "Admin/staff comercial". [propuesto]: la plataforma no modela un rol
// dedicado de staff comercial (TenantRole solo tiene player/coach/admin/parent/director) —
// restringido a admin/director, mismo criterio conservador que otras brechas de rol de este repo.
@Controller('crm-enrollment/prospects')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director')
export class ProspectController {
  constructor(private readonly service: ProspectService) {}

  @Post()
  crear(@CurrentUser() actor: AuthenticatedUser, @Body() body: { name: string; contactInfo: string; source: string; tags?: string[]; assignedTo?: string }) {
    return this.service.crear({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      name: body.name,
      contactInfo: body.contactInfo,
      source: body.source,
      tags: body.tags,
      assignedTo: body.assignedTo ?? null,
    });
  }

  @Post(':id/stage')
  cambiarStage(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: { stage: ProspectStage }) {
    return this.service.cambiarStage({ organizationId: actor.organizationId, actorUserId: actor.userId, prospectId: id, stage: body.stage });
  }

  @Get()
  listar(@CurrentUser() actor: AuthenticatedUser, @Query('stage') stage?: ProspectStage) {
    return this.service.listar(actor.organizationId, { stage });
  }

  @Get(':id')
  obtener(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.service.obtenerPorId(actor.organizationId, id);
  }
}
