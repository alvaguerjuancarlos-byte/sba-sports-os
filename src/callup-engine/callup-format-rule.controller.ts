import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { CallupFormatRuleService } from './callup-format-rule.service.js';
import type { CallupFormatRuleStatus } from './callup-engine.types.js';

// UC-CUP-06 — Actor: Admin.
@Controller('callup-engine/format-rules')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director')
export class CallupFormatRuleController {
  constructor(private readonly callupFormatRuleService: CallupFormatRuleService) {}

  @Post()
  crear(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() body: { sport: string; format: string; maxPlayers: number; priorityWindowDays?: number },
  ) {
    return this.callupFormatRuleService.crear({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      sport: body.sport,
      format: body.format,
      maxPlayers: body.maxPlayers,
      priorityWindowDays: body.priorityWindowDays,
    });
  }

  @Post(':id/archive')
  archivar(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.callupFormatRuleService.archivar({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      callupFormatRuleId: id,
    });
  }

  @Get()
  listar(@CurrentUser() actor: AuthenticatedUser, @Query('status') status?: CallupFormatRuleStatus) {
    return this.callupFormatRuleService.listar(actor.organizationId, { status });
  }
}
