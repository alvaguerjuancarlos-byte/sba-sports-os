import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { VendorService } from './vendor.service.js';
import { crearAuditLogFalso, crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'admin-1';

// UC-ADM-06 — condensado: alta + archivar sin borrar.
describe('VendorService', () => {
  let auditLog: ReturnType<typeof crearAuditLogFalso>;

  beforeEach(() => {
    auditLog = crearAuditLogFalso();
  });

  it('crea un vendor activo y lo audita', async () => {
    const stubs: QueryStub[] = [
      { matcher: /insert into vendor/i, rows: [{ id: 'vendor-1', name: 'Deportes SA', tax_id: 'ABC123', status: 'active' }] },
    ];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new VendorService(db as never, auditLog as never);

    const resultado = await service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, name: 'Deportes SA', taxId: 'ABC123' });

    expect(resultado.status).toBe('active');
    expect(auditLog.record).toHaveBeenCalledOnce();
  });

  it('lanza NotFoundException al archivar un vendor inexistente', async () => {
    const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from vendor where id/i, rows: [] }]));
    const service = new VendorService(db as never, auditLog as never);

    await expect(service.archivar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, vendorId: 'no-existe' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('archiva sin borrar — mismo principio que Configuration Studio', async () => {
    const anterior = { id: 'vendor-1', status: 'active' };
    const stubs: QueryStub[] = [
      { matcher: /select \* from vendor where id/i, rows: [anterior] },
      { matcher: /update vendor set status = 'archived'/i, rows: [{ ...anterior, status: 'archived' }] },
    ];
    const client = crearClientFalso(stubs);
    const db = crearDbFalsa(client);
    const service = new VendorService(db as never, auditLog as never);

    const resultado = await service.archivar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, vendorId: 'vendor-1' });

    expect(resultado.status).toBe('archived');
    const llamadasDelete = (client.query as ReturnType<typeof vi.fn>).mock.calls.filter(([sql]: [string]) => /delete/i.test(sql));
    expect(llamadasDelete).toHaveLength(0);
  });
});
