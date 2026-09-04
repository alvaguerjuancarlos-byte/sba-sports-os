import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PoolClient } from 'pg';
import { BulkImportService } from './bulk-import.service.js';
import { crearAuditLogFalso, crearDbFalsa } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'admin-1';

// UC-CFG-03 — un test por criterio de aceptación textual.
describe('BulkImportService', () => {
  let auditLog: ReturnType<typeof crearAuditLogFalso>;

  beforeEach(() => {
    auditLog = crearAuditLogFalso();
  });

  describe('importarLote', () => {
    it('valida cada fila con las mismas reglas del alta individual y reporta errores fila por fila sin abortar el lote', async () => {
      let contador = 0;
      const query = vi.fn((sql: string, params: unknown[] = []) => {
        if (/insert into financial_dimension/i.test(sql)) {
          const nombre = params[2] as string;
          if (nombre === 'Duplicado') {
            return Promise.reject(Object.assign(new Error('duplicate key'), { code: '23505' }));
          }
          contador++;
          return Promise.resolve({ rows: [{ id: `dim-${contador}`, type: params[1], name: nombre, parent_id: null, status: 'active' }] });
        }
        throw new Error(`Query sin stub configurado: ${sql}`);
      });
      const client = { query } as unknown as PoolClient;
      const db = crearDbFalsa(client);
      const service = new BulkImportService(db as never, auditLog as never);

      const resultado = await service.importarLote({
        organizationId: ORG_ID,
        actorUserId: ACTOR_ID,
        entidad: 'financial_dimension',
        filas: [
          { type: 'class', name: 'Revenue' },
          { type: 'class', name: 'Duplicado' },
          { type: 'class', name: 'Expense' },
        ],
      });

      expect(resultado.totalFilas).toBe(3);
      expect(resultado.exitosas).toBe(2);
      expect(resultado.fallidas).toBe(1);
      expect(resultado.resultados[0].ok).toBe(true);
      expect(resultado.resultados[1].ok).toBe(false);
      expect(resultado.resultados[1].error).toMatch(/ya existe/i);
      expect(resultado.resultados[2].ok).toBe(true);
    });

    it('registra una sola entrada de audit_log para todo el lote, no una por fila', async () => {
      const query = vi.fn((sql: string, params: unknown[] = []) => {
        if (/insert into financial_dimension/i.test(sql)) {
          return Promise.resolve({ rows: [{ id: 'dim-1', type: params[1], name: params[2], parent_id: null, status: 'active' }] });
        }
        throw new Error(`Query sin stub configurado: ${sql}`);
      });
      const client = { query } as unknown as PoolClient;
      const db = crearDbFalsa(client);
      const service = new BulkImportService(db as never, auditLog as never);

      await service.importarLote({
        organizationId: ORG_ID,
        actorUserId: ACTOR_ID,
        entidad: 'financial_dimension',
        filas: [
          { type: 'class', name: 'Revenue' },
          { type: 'group', name: 'Marketing' },
        ],
      });

      expect(auditLog.record).toHaveBeenCalledOnce();
      expect(auditLog.record).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          entityType: 'bulk_import',
          newValue: expect.objectContaining({ totalFilas: 2, exitosas: 2, fallidas: 0 }),
        }),
      );
    });
  });

  describe('exportarCsv', () => {
    it('exporta las dimensiones como CSV', async () => {
      const query = vi.fn((sql: string) => {
        if (/select id, type, name, parent_id, status from financial_dimension/i.test(sql)) {
          return Promise.resolve({ rows: [{ id: 'dim-1', type: 'class', name: 'Revenue', parent_id: null, status: 'active' }] });
        }
        throw new Error(`Query sin stub configurado: ${sql}`);
      });
      const client = { query } as unknown as PoolClient;
      const db = crearDbFalsa(client);
      const service = new BulkImportService(db as never, auditLog as never);

      const csv = await service.exportarCsv(ORG_ID, 'financial_dimension');

      expect(csv).toContain('id,type,name,parent_id,status');
      expect(csv).toContain('dim-1,class,Revenue,,active');
    });

    it('exporta solo el catálogo de productos activo y vigente', async () => {
      const query = vi.fn((sql: string) => {
        if (/status = 'active' and effective_until is null/i.test(sql)) {
          return Promise.resolve({
            rows: [{ id: 'v1', product_key: 'pk-1', name: 'Uniforme', price: '250.00', financial_dimension_id: null, effective_date: '2026-01-01', effective_until: null, status: 'active' }],
          });
        }
        throw new Error(`Query sin stub configurado: ${sql}`);
      });
      const client = { query } as unknown as PoolClient;
      const db = crearDbFalsa(client);
      const service = new BulkImportService(db as never, auditLog as never);

      const csv = await service.exportarCsv(ORG_ID, 'product_catalog');

      expect(csv).toContain('Uniforme');
    });
  });
});
