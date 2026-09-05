import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { crearAuditLogFalso, crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'actor-1';

function fechaHaceAnios(anios: number): Date {
  const hoy = new Date();
  return new Date(hoy.getFullYear() - anios, hoy.getMonth(), hoy.getDate());
}

// UC-ID-01 y UC-ID-02 — un test por cada criterio de aceptación textual citado en el plan.
describe('UsersService', () => {
  let auditLog: ReturnType<typeof crearAuditLogFalso>;

  beforeEach(() => {
    auditLog = crearAuditLogFalso();
  });

  describe('altaUsuarioConRolInicial (UC-ID-01)', () => {
    it('bloquea el alta si falta date_of_birth (obligatorio, no opcional)', async () => {
      const db = crearDbFalsa(crearClientFalso([]));
      const service = new UsersService(db as never, auditLog as never);

      await expect(
        service.altaUsuarioConRolInicial({
          organizationId: ORG_ID,
          actorUserId: ACTOR_ID,
          fullName: 'Ana',
          email: 'ana@example.com',
          dateOfBirth: undefined as unknown as Date,
          role: 'player',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(db.withTenant).not.toHaveBeenCalled();
    });

    it('exige al menos email o teléfono', async () => {
      const db = crearDbFalsa(crearClientFalso([]));
      const service = new UsersService(db as never, auditLog as never);

      await expect(
        service.altaUsuarioConRolInicial({
          organizationId: ORG_ID,
          actorUserId: ACTOR_ID,
          fullName: 'Ana',
          dateOfBirth: fechaHaceAnios(30),
          role: 'coach',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('nunca crea un user duplicado para el mismo email — reutiliza el user global existente', async () => {
      const existente = { id: 'user-existente', full_name: 'Ana', email: 'ana@example.com', phone: null };
      const stubs: QueryStub[] = [
        { matcher: /select \* from "user" where \(/i, rows: [existente] },
        { matcher: /insert into user_tenant_role/i, rows: [{ id: 'rol-1', status: 'active' }] },
      ];
      const client = crearClientFalso(stubs);
      const db = crearDbFalsa(client);
      const service = new UsersService(db as never, auditLog as never);

      const resultado = await service.altaUsuarioConRolInicial({
        organizationId: ORG_ID,
        actorUserId: ACTOR_ID,
        fullName: 'Ana',
        email: 'ana@example.com',
        dateOfBirth: fechaHaceAnios(30),
        role: 'coach',
      });

      expect(resultado.user.id).toBe('user-existente');
      const llamadasInsertUser = (client.query as ReturnType<typeof vi.fn>).mock.calls.filter(([sql]: [string]) =>
        /insert into "user"/i.test(sql),
      );
      expect(llamadasInsertUser).toHaveLength(0);
    });

    it('un player menor de edad sin guardianUserId no puede darse de alta', async () => {
      const db = crearDbFalsa(crearClientFalso([]));
      const service = new UsersService(db as never, auditLog as never);

      await expect(
        service.altaUsuarioConRolInicial({
          organizationId: ORG_ID,
          actorUserId: ACTOR_ID,
          fullName: 'Niño',
          email: 'nino@example.com',
          dateOfBirth: fechaHaceAnios(10),
          role: 'player',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('un player menor de edad con guardianUserId queda pending y crea guardian_link requested', async () => {
      const stubs: QueryStub[] = [
        { matcher: /select \* from "user" where \(/i, rows: [] },
        { matcher: /insert into "user"/i, rows: [{ id: 'user-nuevo' }] },
        { matcher: /insert into user_tenant_role/i, rows: [{ id: 'rol-1', status: 'pending' }] },
        { matcher: /insert into guardian_link/i, rows: [{ id: 'guardian-link-1' }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new UsersService(db as never, auditLog as never);

      const resultado = await service.altaUsuarioConRolInicial({
        organizationId: ORG_ID,
        actorUserId: ACTOR_ID,
        fullName: 'Niño',
        email: 'nino@example.com',
        dateOfBirth: fechaHaceAnios(10),
        role: 'player',
        guardianUserId: 'tutor-1',
      });

      expect(resultado.esMenorDeEdad).toBe(true);
      expect(resultado.requiereConsentimientoTutor).toBe(true);
      expect(resultado.guardianLinkId).toBe('guardian-link-1');
      expect(resultado.userTenantRole.status).toBe('pending');
      expect(auditLog.record).toHaveBeenCalledOnce();
    });

    it('un menor con rol distinto de player (ej. coach) no requiere consentimiento y queda activo directo', async () => {
      const stubs: QueryStub[] = [
        { matcher: /select \* from "user" where \(/i, rows: [] },
        { matcher: /insert into "user"/i, rows: [{ id: 'user-nuevo' }] },
        { matcher: /insert into user_tenant_role/i, rows: [{ id: 'rol-1', status: 'active' }] },
      ];
      const client = crearClientFalso(stubs);
      const db = crearDbFalsa(client);
      const service = new UsersService(db as never, auditLog as never);

      const resultado = await service.altaUsuarioConRolInicial({
        organizationId: ORG_ID,
        actorUserId: ACTOR_ID,
        fullName: 'Coach Joven',
        email: 'coach@example.com',
        dateOfBirth: fechaHaceAnios(16),
        role: 'coach',
      });

      expect(resultado.requiereConsentimientoTutor).toBe(false);
      expect(resultado.userTenantRole.status).toBe('active');
      const llamadasGuardianLink = (client.query as ReturnType<typeof vi.fn>).mock.calls.filter(([sql]: [string]) =>
        /insert into guardian_link/i.test(sql),
      );
      expect(llamadasGuardianLink).toHaveLength(0);
    });

    it('el alta queda registrada en audit_log', async () => {
      const stubs: QueryStub[] = [
        { matcher: /select \* from "user" where \(/i, rows: [] },
        { matcher: /insert into "user"/i, rows: [{ id: 'user-nuevo' }] },
        { matcher: /insert into user_tenant_role/i, rows: [{ id: 'rol-1', status: 'active' }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new UsersService(db as never, auditLog as never);

      await service.altaUsuarioConRolInicial({
        organizationId: ORG_ID,
        actorUserId: ACTOR_ID,
        fullName: 'Ana',
        email: 'ana@example.com',
        dateOfBirth: fechaHaceAnios(30),
        role: 'coach',
      });

      expect(auditLog.record).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ organizationId: ORG_ID, actorUserId: ACTOR_ID, entityType: 'user_tenant_role' }),
      );
    });
  });

  describe('asignarRolAdicional (UC-ID-02)', () => {
    it('si el user no existe, redirige a UC-ID-01 en vez de crearlo aquí', async () => {
      const stubs: QueryStub[] = [{ matcher: /select \* from "user" where id = \$1/i, rows: [] }];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new UsersService(db as never, auditLog as never);

      await expect(
        service.asignarRolAdicional({
          organizationId: ORG_ID,
          actorUserId: ACTOR_ID,
          userId: 'no-existe',
          role: 'coach',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('reusa el user existente y agrega un segundo rol sin duplicar identidad', async () => {
      const usuarioAdulto = { id: 'user-1', date_of_birth: fechaHaceAnios(30).toISOString() };
      const stubs: QueryStub[] = [
        { matcher: /select \* from "user" where id = \$1/i, rows: [usuarioAdulto] },
        { matcher: /insert into user_tenant_role/i, rows: [{ id: 'rol-2', status: 'active' }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new UsersService(db as never, auditLog as never);

      const resultado = await service.asignarRolAdicional({
        organizationId: ORG_ID,
        actorUserId: ACTOR_ID,
        userId: 'user-1',
        role: 'coach',
      });

      expect(resultado.status).toBe('active');
      expect(auditLog.record).toHaveBeenCalledOnce();
    });

    it('nunca crea un segundo user_tenant_role idéntico — violación de unicidad se traduce a ConflictException', async () => {
      const usuarioAdulto = { id: 'user-1', date_of_birth: fechaHaceAnios(30).toISOString() };
      const client = crearClientFalso([{ matcher: /select \* from "user" where id = \$1/i, rows: [usuarioAdulto] }]);
      (client.query as ReturnType<typeof vi.fn>).mockImplementation((sql: string) => {
        if (/select \* from "user" where id = \$1/i.test(sql)) return Promise.resolve({ rows: [usuarioAdulto] });
        if (/insert into user_tenant_role/i.test(sql)) {
          const error = Object.assign(new Error('duplicate key'), { code: '23505' });
          return Promise.reject(error);
        }
        throw new Error(`Query sin stub configurado: ${sql}`);
      });
      const db = crearDbFalsa(client);
      const service = new UsersService(db as never, auditLog as never);

      await expect(
        service.asignarRolAdicional({
          organizationId: ORG_ID,
          actorUserId: ACTOR_ID,
          userId: 'user-1',
          role: 'coach',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('un player menor sin guardianUserId no puede recibir el rol adicional', async () => {
      const usuarioMenor = { id: 'user-1', date_of_birth: fechaHaceAnios(10).toISOString() };
      const db = crearDbFalsa(
        crearClientFalso([{ matcher: /select \* from "user" where id = \$1/i, rows: [usuarioMenor] }]),
      );
      const service = new UsersService(db as never, auditLog as never);

      await expect(
        service.asignarRolAdicional({
          organizationId: ORG_ID,
          actorUserId: ACTOR_ID,
          userId: 'user-1',
          role: 'player',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('tieneRolActivoEnOrganizacion', () => {
    it('regresa true si existe un user_tenant_role activo', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select 1 from user_tenant_role/i, rows: [{ '?column?': 1 }] }]));
      const service = new UsersService(db as never, auditLog as never);

      await expect(service.tieneRolActivoEnOrganizacion(ORG_ID, 'user-1')).resolves.toBe(true);
    });

    it('regresa false si no hay ningún user_tenant_role activo — usado por Sports Hub (UC-SPT-03) para bloquear el alta al roster', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select 1 from user_tenant_role/i, rows: [] }]));
      const service = new UsersService(db as never, auditLog as never);

      await expect(service.tieneRolActivoEnOrganizacion(ORG_ID, 'user-1')).resolves.toBe(false);
    });
  });

  describe('obtenerPorId', () => {
    it('regresa el usuario si existe — "user" es global, no usa withTenant', async () => {
      const db = crearDbFalsa(crearClientFalso([]));
      (db.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [{ id: 'user-1', date_of_birth: '2015-01-01' }] });
      const service = new UsersService(db as never, auditLog as never);

      const resultado = await service.obtenerPorId('user-1');

      expect(resultado?.id).toBe('user-1');
      expect(db.withTenant).not.toHaveBeenCalled();
    });

    it('regresa null si no existe — usado por Calendar & RSVP (UC-CAL-03) para decidir sin lanzar', async () => {
      const db = crearDbFalsa(crearClientFalso([]));
      (db.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [] });
      const service = new UsersService(db as never, auditLog as never);

      await expect(service.obtenerPorId('no-existe')).resolves.toBeNull();
    });
  });
});
