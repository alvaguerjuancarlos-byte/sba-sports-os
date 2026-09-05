import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../identity-access/users.service.js';

export interface EmitirTokenDevInput {
  userId: string;
  organizationId: string;
}

// LOGIN DE DESARROLLO — NUNCA usar en staging/prod. El backend nunca integró Auth0/Cognito real
// (ver jwt.strategy.ts: solo verifica firma HMAC con JWT_SECRET); mientras eso no exista, este
// servicio firma JWTs válidos para usuarios YA sembrados en la base (scripts/seed-dev.mjs), para
// poder navegar el frontend con sesiones reales. No hay password ni ningún factor de
// verificación — cualquiera que conozca un userId puede "iniciar sesión" como esa persona. Se
// reemplaza por completo el día que se integre el proveedor de identidad real.
@Injectable()
export class DevLoginService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async emitirToken(input: EmitirTokenDevInput): Promise<{ token: string }> {
    const persona = await this.usersService.obtenerPorId(input.userId);
    if (!persona) throw new NotFoundException('No existe un user con ese id — correr scripts/seed-dev.mjs primero.');

    const roles = await this.usersService.listarRolesDeUsuario(input.organizationId, input.userId);
    const rolesActivos = roles.filter((r) => r.status === 'active').map((r) => r.role);
    if (rolesActivos.length === 0) {
      throw new ForbiddenException('Esta persona no tiene ningún rol activo en esta organización.');
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET no está definida — ver .env.example.');

    const token = this.jwtService.sign(
      { sub: input.userId, org_id: input.organizationId, roles: rolesActivos, amr: ['mfa'] },
      { secret, expiresIn: '8h' },
    );

    return { token };
  }
}
