import { describe, expect, it, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service.js';
import { crearAuditLogFalso, crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'staff-1';
const PROSPECT_ID = 'prospect-1';
const NEW_USER_ID = 'user-nuevo-1';
const ROLE_ID = 'role-1';

function prospectServiceFalso(prospect: Record<string, unknown> | null) {
  return {
    obtenerPorId: vi.fn().mockResolvedValue(prospect),
    marcarConvertido: vi.fn().mockResolvedValue({ id: PROSPECT_ID, stage: 'won', converted_at: '2026-01-01' }),
  };
}
function usersServiceFalso() {
  return {
    altaUsuarioConRolInicial: vi.fn().mockResolvedValue({
      user: { id: NEW_USER_ID, full_name: 'Prospecto Convertido' },
      userTenantRole: { id: ROLE_ID, role: 'player', status: 'active' },
      esMenorDeEdad: false,
      requiereConsentimientoTutor: false,
      guardianLinkId: null,
    }),
  };
}
function accessRevocationServiceFalso() {
  return { revocarAcceso: vi.fn().mockResolvedValue(undefined) };
}
function membershipPlanServiceFalso(lanzaError = false) {
  return {
    crear: lanzaError ? vi.fn().mockRejectedValue(new Error('el producto ya no existe')) : vi.fn().mockResolvedValue({ id: 'plan-1', athlete_user_id: NEW_USER_ID }),
  };
}

const INPUT_BASE = {
  organizationId: ORG_ID,
  actorUserId: ACTOR_ID,
  prospectId: PROSPECT_ID,
  dateOfBirth: '2010-01-01',
  email: 'nuevo@x.com',
  productCatalogId: 'prod-1',
  currency: 'MXN',
  billingCycle: 'monthly' as const,
};

// UC-CRM-03 — un test por criterio de aceptación textual.
describe('EnrollmentService.convertir', () => {
  it('lanza NotFoundException si el prospect no existe', async () => {
    const db = crearDbFalsa(crearClientFalso([]));
    const service = new EnrollmentService(
      db as never,
      crearAuditLogFalso() as never,
      usersServiceFalso() as never,
      accessRevocationServiceFalso() as never,
      membershipPlanServiceFalso() as never,
      prospectServiceFalso(null) as never,
    );

    await expect(service.convertir(INPUT_BASE)).rejects.toThrow(NotFoundException);
  });

  it('rechaza convertir dos veces el mismo prospect', async () => {
    const db = crearDbFalsa(crearClientFalso([]));
    const service = new EnrollmentService(
      db as never,
      crearAuditLogFalso() as never,
      usersServiceFalso() as never,
      accessRevocationServiceFalso() as never,
      membershipPlanServiceFalso() as never,
      prospectServiceFalso({ id: PROSPECT_ID, stage: 'won', converted_at: '2026-01-01' }) as never,
    );

    await expect(service.convertir(INPUT_BASE)).rejects.toThrow(ConflictException);
  });

  it('crea user+rol (reutilizando identidad si ya existe, vía UsersService), membership_plan y enrollment en el flujo feliz', async () => {
    const auditLog = crearAuditLogFalso();
    const stubs: QueryStub[] = [{ matcher: /insert into enrollment/i, rows: [{ id: 'enr-1', prospect_id: PROSPECT_ID, user_id: NEW_USER_ID, plan_id: 'plan-1' }] }];
    const usersService = usersServiceFalso();
    const membershipPlanService = membershipPlanServiceFalso();
    const service = new EnrollmentService(
      crearDbFalsa(crearClientFalso(stubs)) as never,
      auditLog as never,
      usersService as never,
      accessRevocationServiceFalso() as never,
      membershipPlanService as never,
      prospectServiceFalso({ id: PROSPECT_ID, stage: 'won', converted_at: null }) as never,
    );

    const resultado = await service.convertir(INPUT_BASE);

    expect(usersService.altaUsuarioConRolInicial).toHaveBeenCalledOnce();
    expect(membershipPlanService.crear).toHaveBeenCalledWith(expect.objectContaining({ athleteUserId: NEW_USER_ID }));
    expect(resultado.enrollment.id).toBe('enr-1');
    expect(resultado.userId).toBe(NEW_USER_ID);
    expect(auditLog.record).toHaveBeenCalledOnce();
  });

  it('2a: si falla la creación del membership_plan tras crear la identidad, compensa revocando el user_tenant_role recién creado', async () => {
    const accessRevocationService = accessRevocationServiceFalso();
    const service = new EnrollmentService(
      crearDbFalsa(crearClientFalso([])) as never,
      crearAuditLogFalso() as never,
      usersServiceFalso() as never,
      accessRevocationService as never,
      membershipPlanServiceFalso(true) as never,
      prospectServiceFalso({ id: PROSPECT_ID, stage: 'won', converted_at: null }) as never,
    );

    await expect(service.convertir(INPUT_BASE)).rejects.toThrow('el producto ya no existe');
    expect(accessRevocationService.revocarAcceso).toHaveBeenCalledWith(expect.objectContaining({ userTenantRoleId: ROLE_ID }));
  });

  it('2a: si falla la creación del enrollment tras crear el membership_plan, también compensa revocando el acceso', async () => {
    const client = crearClientFalso([]);
    (client.query as ReturnType<typeof vi.fn>).mockImplementation((sql: string) => {
      if (/insert into enrollment/i.test(sql)) return Promise.reject(new Error('constraint violado'));
      throw new Error(`Query sin stub configurado: ${sql}`);
    });
    const accessRevocationService = accessRevocationServiceFalso();
    const service = new EnrollmentService(
      crearDbFalsa(client) as never,
      crearAuditLogFalso() as never,
      usersServiceFalso() as never,
      accessRevocationService as never,
      membershipPlanServiceFalso() as never,
      prospectServiceFalso({ id: PROSPECT_ID, stage: 'won', converted_at: null }) as never,
    );

    await expect(service.convertir(INPUT_BASE)).rejects.toThrow('constraint violado');
    expect(accessRevocationService.revocarAcceso).toHaveBeenCalledWith(expect.objectContaining({ userTenantRoleId: ROLE_ID }));
  });
});
