import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductCatalogService } from './product-catalog.service.js';
import { crearAuditLogFalso, crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'admin-1';

// UC-CFG-02 — un test por criterio de aceptación textual.
describe('ProductCatalogService', () => {
  let auditLog: ReturnType<typeof crearAuditLogFalso>;

  beforeEach(() => {
    auditLog = crearAuditLogFalso();
  });

  describe('crearVersion', () => {
    it('crea la primera versión de un producto nuevo sin productKey', async () => {
      const stubs: QueryStub[] = [
        {
          matcher: /insert into product_catalog/i,
          rows: [{ id: 'v1', product_key: 'pk-nuevo', name: 'Uniforme', price: '250.00', effective_date: '2026-01-01', effective_until: null, status: 'active' }],
        },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new ProductCatalogService(db as never, auditLog as never);

      const resultado = await service.crearVersion({
        organizationId: ORG_ID,
        actorUserId: ACTOR_ID,
        name: 'Uniforme',
        price: '250.00',
        effectiveDate: '2026-01-01',
      });

      expect(resultado.id).toBe('v1');
      expect(auditLog.record).toHaveBeenCalledOnce();
    });

    it('lanza NotFoundException si se pasa un productKey que no existe', async () => {
      const db = crearDbFalsa(
        crearClientFalso([{ matcher: /order by effective_date desc limit 1/i, rows: [] }]),
      );
      const service = new ProductCatalogService(db as never, auditLog as never);

      await expect(
        service.crearVersion({
          organizationId: ORG_ID,
          actorUserId: ACTOR_ID,
          productKey: 'no-existe',
          name: 'Uniforme',
          price: '300.00',
          effectiveDate: '2026-06-01',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('no permite retroceder la vigencia — effective_date debe ser posterior a la última versión', async () => {
      const ultimaVersion = { id: 'v1', effective_date: '2026-06-01', effective_until: null };
      const db = crearDbFalsa(
        crearClientFalso([{ matcher: /order by effective_date desc limit 1/i, rows: [ultimaVersion] }]),
      );
      const service = new ProductCatalogService(db as never, auditLog as never);

      await expect(
        service.crearVersion({
          organizationId: ORG_ID,
          actorUserId: ACTOR_ID,
          productKey: 'pk-1',
          name: 'Uniforme',
          price: '300.00',
          effectiveDate: '2026-01-01', // anterior a la última versión
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('ninguna factura histórica cambia de monto: crear una nueva versión nunca edita el price de la anterior, solo cierra su vigencia', async () => {
      const ultimaVersion = { id: 'v1', effective_date: '2026-01-01', effective_until: null };
      const stubs: QueryStub[] = [
        { matcher: /order by effective_date desc limit 1/i, rows: [ultimaVersion] },
        { matcher: /update product_catalog set effective_until = \$2 where id = \$1/i, rows: [] },
        {
          matcher: /insert into product_catalog/i,
          rows: [{ id: 'v2', product_key: 'pk-1', name: 'Uniforme', price: '300.00', effective_date: '2026-06-01', effective_until: null, status: 'active' }],
        },
      ];
      const client = crearClientFalso(stubs);
      const db = crearDbFalsa(client);
      const service = new ProductCatalogService(db as never, auditLog as never);

      await service.crearVersion({
        organizationId: ORG_ID,
        actorUserId: ACTOR_ID,
        productKey: 'pk-1',
        name: 'Uniforme',
        price: '300.00',
        effectiveDate: '2026-06-01',
      });

      const llamadaCierre = (client.query as ReturnType<typeof vi.fn>).mock.calls.find(([sql]: [string]) =>
        /update product_catalog set effective_until/i.test(sql),
      );
      expect(llamadaCierre).toBeDefined();
      expect(llamadaCierre![1]).toEqual(['v1', '2026-06-01']);
      const llamadasEditanPrecio = (client.query as ReturnType<typeof vi.fn>).mock.calls.filter(([sql]: [string]) =>
        /update product_catalog set price/i.test(sql),
      );
      expect(llamadasEditanPrecio).toHaveLength(0);
    });
  });

  describe('archivar', () => {
    it('lanza NotFoundException si no existe ninguna versión con ese product_key', async () => {
      const db = crearDbFalsa(
        crearClientFalso([{ matcher: /product_catalog where product_key = \$1$/i, rows: [] }]),
      );
      const service = new ProductCatalogService(db as never, auditLog as never);

      await expect(service.archivar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, productKey: 'no-existe' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('archiva sin borrar — mismo principio que UC-CFG-01', async () => {
      const versiones = [{ id: 'v1', status: 'active' }, { id: 'v2', status: 'active' }];
      const versionesArchivadas = versiones.map((v) => ({ ...v, status: 'archived' }));
      const stubs: QueryStub[] = [
        { matcher: /product_catalog where product_key = \$1$/i, rows: versiones },
        { matcher: /update product_catalog set status = 'archived'/i, rows: versionesArchivadas },
      ];
      const client = crearClientFalso(stubs);
      const db = crearDbFalsa(client);
      const service = new ProductCatalogService(db as never, auditLog as never);

      const resultado = await service.archivar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, productKey: 'pk-1' });

      expect(resultado.every((v) => v.status === 'archived')).toBe(true);
      const llamadasDelete = (client.query as ReturnType<typeof vi.fn>).mock.calls.filter(([sql]: [string]) => /delete/i.test(sql));
      expect(llamadasDelete).toHaveLength(0);
    });
  });

  describe('listarActivos', () => {
    it('el catálogo activo solo refleja productos no archivados con versión vigente', async () => {
      const stubs: QueryStub[] = [
        { matcher: /status = 'active' and effective_until is null/i, rows: [{ id: 'v1', status: 'active', effective_until: null }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new ProductCatalogService(db as never, auditLog as never);

      const resultado = await service.listarActivos(ORG_ID);

      expect(resultado).toHaveLength(1);
    });
  });
});
