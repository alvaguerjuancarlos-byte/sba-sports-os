import { describe, expect, it, vi } from 'vitest';
import type { PoolClient } from 'pg';
import { AuditLogQueryService } from './audit-log-query.service.js';
import { crearDbFalsa } from './test-helpers.js';

const ORG_ID = 'org-1';

// UC-CFG-04 — solo lectura, filtrable por entidad, actor y rango de fecha.
describe('AuditLogQueryService', () => {
  it('sin filtros consulta todo el audit_log del tenant (RLS ya filtra por organización)', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: 'log-1' }] });
    const client = { query } as unknown as PoolClient;
    const db = crearDbFalsa(client);
    const service = new AuditLogQueryService(db as never);

    const resultado = await service.consultar({ organizationId: ORG_ID });

    expect(resultado).toHaveLength(1);
    const [sql, params] = query.mock.calls[0];
    expect(sql).not.toMatch(/where/i);
    expect(params).toEqual([]);
  });

  it('filtra por entityType, actorUserId y rango de fecha combinados', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const client = { query } as unknown as PoolClient;
    const db = crearDbFalsa(client);
    const service = new AuditLogQueryService(db as never);

    const from = new Date('2026-01-01');
    const to = new Date('2026-12-31');
    await service.consultar({ organizationId: ORG_ID, entityType: 'financial_dimension', actorUserId: 'admin-1', from, to });

    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/entity_type = \$1/);
    expect(sql).toMatch(/actor_user_id = \$2/);
    expect(sql).toMatch(/occurred_at >= \$3/);
    expect(sql).toMatch(/occurred_at <= \$4/);
    expect(params).toEqual(['financial_dimension', 'admin-1', from, to]);
  });

  it('ordena por occurred_at descendente (más reciente primero)', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const client = { query } as unknown as PoolClient;
    const db = crearDbFalsa(client);
    const service = new AuditLogQueryService(db as never);

    await service.consultar({ organizationId: ORG_ID });

    const [sql] = query.mock.calls[0];
    expect(sql).toMatch(/order by occurred_at desc/i);
  });
});
