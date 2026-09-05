import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { VenueService } from './venue.service.js';
import { crearAuditLogFalso, crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'admin-1';

describe('VenueService', () => {
  let auditLog: ReturnType<typeof crearAuditLogFalso>;

  beforeEach(() => {
    auditLog = crearAuditLogFalso();
  });

  it('crea un venue activo y lo audita', async () => {
    const stubs: QueryStub[] = [{ matcher: /insert into venue/i, rows: [{ id: 'venue-1', name: 'Cancha Central', status: 'active' }] }];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new VenueService(db as never, auditLog as never);

    const resultado = await service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, name: 'Cancha Central' });

    expect(resultado.status).toBe('active');
    expect(auditLog.record).toHaveBeenCalledOnce();
  });

  it('lanza NotFoundException al archivar un venue inexistente', async () => {
    const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from venue where id/i, rows: [] }]));
    const service = new VenueService(db as never, auditLog as never);

    await expect(service.archivar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, venueId: 'no-existe' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('archiva sin borrar', async () => {
    const anterior = { id: 'venue-1', status: 'active' };
    const stubs: QueryStub[] = [
      { matcher: /select \* from venue where id/i, rows: [anterior] },
      { matcher: /update venue set status = 'archived'/i, rows: [{ ...anterior, status: 'archived' }] },
    ];
    const client = crearClientFalso(stubs);
    const db = crearDbFalsa(client);
    const service = new VenueService(db as never, auditLog as never);

    const resultado = await service.archivar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, venueId: 'venue-1' });

    expect(resultado.status).toBe('archived');
    const llamadasDelete = (client.query as ReturnType<typeof vi.fn>).mock.calls.filter(([sql]: [string]) => /delete/i.test(sql));
    expect(llamadasDelete).toHaveLength(0);
  });
});
