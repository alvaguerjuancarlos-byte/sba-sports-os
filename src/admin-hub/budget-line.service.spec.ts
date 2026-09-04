import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { BudgetLineService } from './budget-line.service.js';
import { crearAuditLogFalso, crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'admin-1';

// UC-ADM-01 — un test por criterio de aceptación textual.
describe('BudgetLineService', () => {
  let auditLog: ReturnType<typeof crearAuditLogFalso>;

  beforeEach(() => {
    auditLog = crearAuditLogFalso();
  });

  describe('crear', () => {
    it('crea el budget_line y lo audita', async () => {
      const stubs: QueryStub[] = [
        {
          matcher: /insert into budget_line/i,
          rows: [{ id: 'bl-1', financial_dimension_id: 'dim-1', season: '2026-2027', period: 'Q1', amount_budgeted: '10000.00', status: 'active' }],
        },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new BudgetLineService(db as never, auditLog as never);

      const resultado = await service.crear({
        organizationId: ORG_ID,
        actorUserId: ACTOR_ID,
        financialDimensionId: 'dim-1',
        season: '2026-2027',
        period: 'Q1',
        amountBudgeted: '10000.00',
      });

      expect(resultado.id).toBe('bl-1');
      expect(auditLog.record).toHaveBeenCalledOnce();
    });

    it('requiere que la dimensión financiera ya exista — violación de FK se traduce a NotFoundException', async () => {
      const client = crearClientFalso([]);
      (client.query as ReturnType<typeof vi.fn>).mockImplementation((sql: string) => {
        if (/insert into budget_line/i.test(sql)) {
          return Promise.reject(Object.assign(new Error('fk violation'), { code: '23503' }));
        }
        throw new Error(`Query sin stub configurado: ${sql}`);
      });
      const db = crearDbFalsa(client);
      const service = new BudgetLineService(db as never, auditLog as never);

      await expect(
        service.crear({
          organizationId: ORG_ID,
          actorUserId: ACTOR_ID,
          financialDimensionId: 'no-existe',
          season: '2026-2027',
          period: 'Q1',
          amountBudgeted: '10000.00',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('no permite dos budget_line para la misma dimensión, temporada y periodo', async () => {
      const client = crearClientFalso([]);
      (client.query as ReturnType<typeof vi.fn>).mockImplementation((sql: string) => {
        if (/insert into budget_line/i.test(sql)) {
          return Promise.reject(Object.assign(new Error('duplicate key'), { code: '23505' }));
        }
        throw new Error(`Query sin stub configurado: ${sql}`);
      });
      const db = crearDbFalsa(client);
      const service = new BudgetLineService(db as never, auditLog as never);

      await expect(
        service.crear({
          organizationId: ORG_ID,
          actorUserId: ACTOR_ID,
          financialDimensionId: 'dim-1',
          season: '2026-2027',
          period: 'Q1',
          amountBudgeted: '10000.00',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('archivar', () => {
    it('lanza NotFoundException si no existe', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from budget_line where id/i, rows: [] }]));
      const service = new BudgetLineService(db as never, auditLog as never);

      await expect(service.archivar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, budgetLineId: 'no-existe' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('archiva sin borrar', async () => {
      const anterior = { id: 'bl-1', status: 'active' };
      const stubs: QueryStub[] = [
        { matcher: /select \* from budget_line where id/i, rows: [anterior] },
        { matcher: /update budget_line set status = 'archived'/i, rows: [{ ...anterior, status: 'archived' }] },
      ];
      const client = crearClientFalso(stubs);
      const db = crearDbFalsa(client);
      const service = new BudgetLineService(db as never, auditLog as never);

      const resultado = await service.archivar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, budgetLineId: 'bl-1' });

      expect(resultado.status).toBe('archived');
      const llamadasDelete = (client.query as ReturnType<typeof vi.fn>).mock.calls.filter(([sql]: [string]) => /delete/i.test(sql));
      expect(llamadasDelete).toHaveLength(0);
    });
  });
});
