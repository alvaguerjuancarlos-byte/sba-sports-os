import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { AccessRevocationService } from './access-revocation.service.js';
import { crearAuditLogFalso, crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'admin-1';
const ROLE_ID = 'rol-1';

// UC-ID-05 — revocación nunca borra historial: solo cierra acceso, preserva el user y la fila.
describe('AccessRevocationService', () => {
  let auditLog: ReturnType<typeof crearAuditLogFalso>;

  beforeEach(() => {
    auditLog = crearAuditLogFalso();
  });

  it('lanza NotFoundException si el user_tenant_role no existe', async () => {
    const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from user_tenant_role/i, rows: [] }]));
    const service = new AccessRevocationService(db as never, auditLog as never);

    await expect(
      service.revocarAcceso({ organizationId: ORG_ID, actorUserId: ACTOR_ID, userTenantRoleId: ROLE_ID }),
    ).rejects.toThrow(NotFoundException);
  });

  it('revoca el acceso poniendo status = revoked, nunca borra la fila', async () => {
    const rolActivo = { id: ROLE_ID, status: 'active' };
    const rolRevocado = { ...rolActivo, status: 'revoked' };
    const stubs: QueryStub[] = [
      { matcher: /select \* from user_tenant_role/i, rows: [rolActivo] },
      { matcher: /update user_tenant_role set status = 'revoked'/i, rows: [rolRevocado] },
    ];
    const client = crearClientFalso(stubs);
    const db = crearDbFalsa(client);
    const service = new AccessRevocationService(db as never, auditLog as never);

    const resultado = await service.revocarAcceso({
      organizationId: ORG_ID,
      actorUserId: ACTOR_ID,
      userTenantRoleId: ROLE_ID,
    });

    expect(resultado.status).toBe('revoked');
    const llamadasDelete = (client.query as ReturnType<typeof vi.fn>).mock.calls.filter(([sql]: [string]) =>
      /delete/i.test(sql),
    );
    expect(llamadasDelete).toHaveLength(0);
  });

  it('registra la revocación en audit_log con el estado anterior y el nuevo', async () => {
    const rolActivo = { id: ROLE_ID, status: 'active' };
    const rolRevocado = { ...rolActivo, status: 'revoked' };
    const stubs: QueryStub[] = [
      { matcher: /select \* from user_tenant_role/i, rows: [rolActivo] },
      { matcher: /update user_tenant_role set status = 'revoked'/i, rows: [rolRevocado] },
    ];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new AccessRevocationService(db as never, auditLog as never);

    await service.revocarAcceso({ organizationId: ORG_ID, actorUserId: ACTOR_ID, userTenantRoleId: ROLE_ID });

    expect(auditLog.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        entityType: 'user_tenant_role',
        entityId: ROLE_ID,
        fieldChanged: 'status',
        oldValue: { status: 'active' },
        newValue: { status: 'revoked' },
      }),
    );
  });
});
