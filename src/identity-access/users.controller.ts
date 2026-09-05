import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { UsersService } from './users.service.js';
import type { TenantRole } from './identity-access.types.js';

// UC-ID-01/02 — "Actor: Admin de organización". No hay DTOs con class-validator todavía (fuera
// de alcance de este primer corte, ver plan) — la validación de negocio real (DOB obligatoria,
// email/teléfono, guardianUserId para menores) vive en UsersService, no aquí.
interface AltaUsuarioBody {
  fullName: string;
  email?: string;
  phone?: string;
  dateOfBirth: string; // ISO 'YYYY-MM-DD'
  role: TenantRole;
  guardianUserId?: string;
}

interface AsignarRolBody {
  role: TenantRole;
  guardianUserId?: string;
}

@Controller('identity/users')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Lectura para el frontend — listado de administración de la organización.
  @Get()
  listar(@CurrentUser() actor: AuthenticatedUser) {
    return this.usersService.listarUsuariosDeOrganizacion(actor.organizationId);
  }

  // UC-ID-01
  @Post()
  altaUsuario(@CurrentUser() actor: AuthenticatedUser, @Body() body: AltaUsuarioBody) {
    return this.usersService.altaUsuarioConRolInicial({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      fullName: body.fullName,
      email: body.email ?? null,
      phone: body.phone ?? null,
      dateOfBirth: new Date(body.dateOfBirth),
      role: body.role,
      guardianUserId: body.guardianUserId ?? null,
    });
  }

  // UC-ID-02
  @Post(':userId/roles')
  asignarRolAdicional(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() body: AsignarRolBody,
  ) {
    return this.usersService.asignarRolAdicional({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      userId,
      role: body.role,
      guardianUserId: body.guardianUserId ?? null,
    });
  }
}
