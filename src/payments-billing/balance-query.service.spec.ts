import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { BalanceQueryService } from './balance-query.service.js';
import { crearDbFalsa } from './test-helpers.js';

const ORG_ID = 'org-1';
const ATHLETE_ID = 'atleta-1';

// UC-PAY-07 — un test por criterio de aceptación textual.
describe('BalanceQueryService', () => {
  it('el propio atleta puede consultar su saldo', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const client = { query } as unknown as PoolClient;
    const db = crearDbFalsa(client);
    const service = new BalanceQueryService(db as never);

    const resultado = await service.consultar({ organizationId: ORG_ID, actorUserId: ATHLETE_ID, actorRoles: ['player'], athleteUserId: ATHLETE_ID });

    expect(resultado.saldoActual).toBe(0);
  });

  it('un admin puede consultar el saldo de cualquier cuenta', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const client = { query } as unknown as PoolClient;
    const db = crearDbFalsa(client);
    const service = new BalanceQueryService(db as never);

    await expect(
      service.consultar({ organizationId: ORG_ID, actorUserId: 'admin-1', actorRoles: ['admin'], athleteUserId: ATHLETE_ID }),
    ).resolves.toBeDefined();
  });

  it('un tercero sin rol admin/director no puede consultar el saldo de otro atleta', async () => {
    const db = crearDbFalsa({ query: vi.fn() } as never);
    const service = new BalanceQueryService(db as never);

    await expect(
      service.consultar({ organizationId: ORG_ID, actorUserId: 'otro-atleta', actorRoles: ['player'], athleteUserId: ATHLETE_ID }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('el saldo actual suma solo las invoices pending, no las pagadas', async () => {
    const query = vi.fn((sql: string) => {
      if (/select \* from invoice/i.test(sql)) {
        return Promise.resolve({
          rows: [
            { id: 'inv-1', status: 'pending', amount_due: '500.00' },
            { id: 'inv-2', status: 'paid', amount_due: '300.00' },
            { id: 'inv-3', status: 'pending', amount_due: '200.00' },
          ],
        });
      }
      if (/select \* from transaction/i.test(sql)) return Promise.resolve({ rows: [] });
      throw new Error(`Query sin stub configurado: ${sql}`);
    });
    const client = { query } as unknown as PoolClient;
    const db = crearDbFalsa(client);
    const service = new BalanceQueryService(db as never);

    const resultado = await service.consultar({ organizationId: ORG_ID, actorUserId: ATHLETE_ID, actorRoles: ['player'], athleteUserId: ATHLETE_ID });

    expect(resultado.saldoActual).toBe(700);
  });

  it('sin invoices, no consulta transactions y regresa listas vacías', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const client = { query } as unknown as PoolClient;
    const db = crearDbFalsa(client);
    const service = new BalanceQueryService(db as never);

    const resultado = await service.consultar({ organizationId: ORG_ID, actorUserId: ATHLETE_ID, actorRoles: ['player'], athleteUserId: ATHLETE_ID });

    expect(resultado.invoices).toHaveLength(0);
    expect(resultado.transactions).toHaveLength(0);
    const llamadasTransaction = query.mock.calls.filter(([sql]: [string]) => /from transaction/i.test(sql));
    expect(llamadasTransaction).toHaveLength(0);
  });
});
