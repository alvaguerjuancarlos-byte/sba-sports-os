import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { EmployeeService } from './employee.service.js';
import type { EmployeeStatus } from './hr-coach-hub.types.js';

// UC-HR-01 — Actor: Admin de HR. Dato restringido (arquitectura §7.4) — admin/director
// únicamente, ni siquiera el propio coach puede ver su expediente por esta vía (criterio literal).
@Controller('hr-coach-hub/employees')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director')
export class EmployeeController {
  constructor(private readonly service: EmployeeService) {}

  @Post()
  altaExpediente(@CurrentUser() actor: AuthenticatedUser, @Body() body: { userId?: string; contractType: string; hireDate: string }) {
    return this.service.altaExpediente({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      userId: body.userId ?? null,
      contractType: body.contractType,
      hireDate: body.hireDate,
    });
  }

  @Post(':id')
  actualizar(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: { contractType?: string; status?: EmployeeStatus }) {
    return this.service.actualizar({ organizationId: actor.organizationId, actorUserId: actor.userId, employeeId: id, contractType: body.contractType, status: body.status });
  }

  @Get()
  listar(@CurrentUser() actor: AuthenticatedUser, @Query('status') status?: EmployeeStatus) {
    return this.service.listar(actor.organizationId, { status });
  }

  @Get(':id')
  obtener(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.service.obtenerPorId(actor.organizationId, id);
  }
}
