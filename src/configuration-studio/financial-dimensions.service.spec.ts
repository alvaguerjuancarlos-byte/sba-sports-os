import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { FinancialDimensionsService } from './financial-dimensions.service.js';
import { crearAuditLogFalso, crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'admin-1';

// UC-CFG-01 — un test por criterio de aceptación textual.
describe('FinancialDimensionsService', () => {
  let auditLog: ReturnType<typeof crearAuditLogFalso>;

  beforeEach(() => {
    auditLog = crearAuditLogFalso();
  });

  describe('crear', () => {
    it('crea una dimensión de tipo class sin padre', async () => {
      const stubs: QueryStub[] = [
        { matcher: /insert into financial_dimension/i, rows: [{ id: 'dim-1', type: 'class', name: 'Revenue', parent_id: null, status: 'active' }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new FinancialDimensionsService(db as never, auditLog as never);

      const resultado = await service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, type: 'class', name: 'Revenue' });

      expect(resultado.id).toBe('dim-1');
      expect(auditLog.record).toHaveBeenCalledOnce();
    });

    it('acepta el ejemplo ilustrativo del documento fuente: class como padre de group', async () => {
      const stubs: QueryStub[] = [
        { matcher: /select \* from financial_dimension where id/i, rows: [{ id: 'dim-1', type: 'class', name: 'Revenue' }] },
        {
          matcher: /insert into financial_dimension/i,
          rows: [{ id: 'dim-2', type: 'group', name: 'Marketing Partnerships', parent_id: 'dim-1', status: 'active' }],
        },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new FinancialDimensionsService(db as never, auditLog as never);

      const resultado = await service.crear({
        organizationId: ORG_ID,
        actorUserId: ACTOR_ID,
        type: 'group',
        name: 'Marketing Partnerships',
        parentId: 'dim-1',
      });

      expect(resultado.parent_id).toBe('dim-1');
    });

    it('rechaza el ejemplo inválido explícito del documento fuente: concept como padre de class', async () => {
      const stubs: QueryStub[] = [
        { matcher: /select \* from financial_dimension where id/i, rows: [{ id: 'dim-1', type: 'concept', name: 'Cargo X' }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new FinancialDimensionsService(db as never, auditLog as never);

      await expect(
        service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, type: 'class', name: 'Revenue', parentId: 'dim-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza NotFoundException si parentId no existe', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from financial_dimension where id/i, rows: [] }]));
      const service = new FinancialDimensionsService(db as never, auditLog as never);

      await expect(
        service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, type: 'group', name: 'X', parentId: 'no-existe' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('el nombre debe ser único dentro del mismo tipo y tenant — violación de unicidad se traduce a ConflictException', async () => {
      const client = crearClientFalso([]);
      (client.query as ReturnType<typeof vi.fn>).mockImplementation((sql: string) => {
        if (/insert into financial_dimension/i.test(sql)) {
          return Promise.reject(Object.assign(new Error('duplicate key'), { code: '23505' }));
        }
        throw new Error(`Query sin stub configurado: ${sql}`);
      });
      const db = crearDbFalsa(client);
      const service = new FinancialDimensionsService(db as never, auditLog as never);

      await expect(
        service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, type: 'class', name: 'Revenue' }),
      ).rejects.toThrow(ConflictException);
    });

    it('el alta queda registrada en audit_log', async () => {
      const stubs: QueryStub[] = [
        { matcher: /insert into financial_dimension/i, rows: [{ id: 'dim-1', type: 'class', name: 'Revenue', parent_id: null, status: 'active' }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new FinancialDimensionsService(db as never, auditLog as never);

      await service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, type: 'class', name: 'Revenue' });

      expect(auditLog.record).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ entityType: 'financial_dimension', entityId: 'dim-1' }),
      );
    });
  });

  describe('archivar', () => {
    it('lanza NotFoundException si la dimensión no existe', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from financial_dimension where id/i, rows: [] }]));
      const service = new FinancialDimensionsService(db as never, auditLog as never);

      await expect(
        service.archivar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, dimensionId: 'no-existe' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('una dimensión con budget_line asociados no puede eliminarse físicamente, solo archivarse', async () => {
      const dimensionActiva = { id: 'dim-1', status: 'active' };
      const dimensionArchivada = { ...dimensionActiva, status: 'archived' };
      const stubs: QueryStub[] = [
        { matcher: /select \* from financial_dimension where id/i, rows: [dimensionActiva] },
        { matcher: /update financial_dimension set status = 'archived'/i, rows: [dimensionArchivada] },
      ];
      const client = crearClientFalso(stubs);
      const db = crearDbFalsa(client);
      const service = new FinancialDimensionsService(db as never, auditLog as never);

      const resultado = await service.archivar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, dimensionId: 'dim-1' });

      expect(resultado.status).toBe('archived');
      const llamadasDelete = (client.query as ReturnType<typeof vi.fn>).mock.calls.filter(([sql]: [string]) => /delete/i.test(sql));
      expect(llamadasDelete).toHaveLength(0);
      expect(auditLog.record).toHaveBeenCalledOnce();
    });
  });
});
