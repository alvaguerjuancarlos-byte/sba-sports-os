import { describe, expect, it, vi } from 'vitest';
import type { PoolClient } from 'pg';
import { BudgetReportService } from './budget-report.service.js';
import { crearDbFalsa } from './test-helpers.js';

const ORG_ID = 'org-1';

// UC-ADM-07 — solo lectura, nunca mezcla comprometido y gastado real en una sola cifra.
describe('BudgetReportService', () => {
  it('separa comprometido (commitments abiertos) y gastado_real (actual_postings) en columnas distintas', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ budget_line_id: 'bl-1', comprometido: '2000', gastado_real: '500' }] });
    const client = { query } as unknown as PoolClient;
    const db = crearDbFalsa(client);
    const service = new BudgetReportService(db as never);

    const resultado = await service.consultar({ organizationId: ORG_ID });

    expect(resultado[0].comprometido).toBe('2000');
    expect(resultado[0].gastado_real).toBe('500');
    const [sql] = query.mock.calls[0];
    expect(sql).toMatch(/status = 'open'/i);
    expect(sql).toMatch(/from actual_posting/i);
  });

  it('filtra por dimensión, temporada y periodo cuando se pasan', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const client = { query } as unknown as PoolClient;
    const db = crearDbFalsa(client);
    const service = new BudgetReportService(db as never);

    await service.consultar({ organizationId: ORG_ID, financialDimensionId: 'dim-1', season: '2026-2027', period: 'Q1' });

    const [, params] = query.mock.calls[0];
    expect(params).toEqual(['dim-1', '2026-2027', 'Q1']);
  });

  it('sin filtros pasa null en los tres parámetros', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const client = { query } as unknown as PoolClient;
    const db = crearDbFalsa(client);
    const service = new BudgetReportService(db as never);

    await service.consultar({ organizationId: ORG_ID });

    const [, params] = query.mock.calls[0];
    expect(params).toEqual([null, null, null]);
  });
});
