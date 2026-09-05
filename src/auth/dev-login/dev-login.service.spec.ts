import { beforeAll, describe, expect, it, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DevLoginService } from './dev-login.service.js';

const ORG_ID = 'org-1';
const USER_ID = 'user-1';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
});

function usersServiceFalso(persona: Record<string, unknown> | null, roles: Record<string, unknown>[] = []) {
  return {
    obtenerPorId: vi.fn().mockResolvedValue(persona),
    listarRolesDeUsuario: vi.fn().mockResolvedValue(roles),
  };
}
function jwtServiceFalso() {
  return { sign: vi.fn().mockReturnValue('token-firmado') };
}

describe('DevLoginService', () => {
  it('lanza NotFoundException si el user no existe (correr el seed primero)', async () => {
    const service = new DevLoginService(usersServiceFalso(null) as never, jwtServiceFalso() as never);

    await expect(service.emitirToken({ userId: 'no-existe', organizationId: ORG_ID })).rejects.toThrow(NotFoundException);
  });

  it('rechaza si la persona no tiene ningún rol activo en esa organización', async () => {
    const usersService = usersServiceFalso({ id: USER_ID }, [{ role: 'player', status: 'pending' }]);
    const service = new DevLoginService(usersService as never, jwtServiceFalso() as never);

    await expect(service.emitirToken({ userId: USER_ID, organizationId: ORG_ID })).rejects.toThrow(ForbiddenException);
  });

  it('firma el JWT solo con los roles ACTIVOS (nunca uno pending) y amr:mfa', async () => {
    const usersService = usersServiceFalso({ id: USER_ID }, [
      { role: 'player', status: 'pending' },
      { role: 'coach', status: 'active' },
    ]);
    const jwtService = jwtServiceFalso();
    const service = new DevLoginService(usersService as never, jwtService as never);

    const resultado = await service.emitirToken({ userId: USER_ID, organizationId: ORG_ID });

    expect(resultado.token).toBe('token-firmado');
    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sub: USER_ID, org_id: ORG_ID, roles: ['coach'], amr: ['mfa'] }),
      expect.any(Object),
    );
  });
});
