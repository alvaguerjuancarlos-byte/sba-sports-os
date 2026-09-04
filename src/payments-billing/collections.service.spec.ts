import { describe, expect, it, vi } from 'vitest';
import type { PoolClient } from 'pg';
import { CollectionsService } from './collections.service.js';
import { crearDbFalsa } from './test-helpers.js';

const ORG_ID = 'org-1';

// UC-PAY-06 — identifica overdue y genera un recordatorio; nunca para facturas que aún no vencen.
describe('CollectionsService', () => {
  it('genera un recordatorio solo para facturas vencidas, no para las que aún no vencen', async () => {
    const query = vi.fn((sql: string) => {
      if (/select \* from invoice where status = 'pending'/i.test(sql)) {
        return Promise.resolve({
          rows: [
            { id: 'inv-vencida', athlete_user_id: 'atleta-1', status: 'pending', due_date: '2020-01-01' },
            { id: 'inv-vigente', athlete_user_id: 'atleta-2', status: 'pending', due_date: '2099-01-01' },
          ],
        });
      }
      if (/insert into notification_log/i.test(sql)) {
        return Promise.resolve({ rows: [{ id: 'notif-1', invoice_id: 'inv-vencida', recipient_user_id: 'atleta-1', channel: 'email' }] });
      }
      throw new Error(`Query sin stub configurado: ${sql}`);
    });
    const client = { query } as unknown as PoolClient;
    const db = crearDbFalsa(client);
    const service = new CollectionsService(db as never);

    const resultado = await service.generarRecordatorios(ORG_ID);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].invoice_id).toBe('inv-vencida');
  });

  it('sin facturas vencidas, no genera ningún recordatorio', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const client = { query } as unknown as PoolClient;
    const db = crearDbFalsa(client);
    const service = new CollectionsService(db as never);

    const resultado = await service.generarRecordatorios(ORG_ID);

    expect(resultado).toHaveLength(0);
  });
});
