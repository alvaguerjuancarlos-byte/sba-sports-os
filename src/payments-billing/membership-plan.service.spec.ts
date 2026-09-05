import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MembershipPlanService } from './membership-plan.service.js';
import { crearAuditLogFalso, crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'admin-1';
const ATHLETE_ID = 'atleta-1';
const PRODUCT_ID = 'prod-1';
const PLAN_ID = 'plan-1';

function productCatalogFalso(producto: Record<string, unknown> | null) {
  return { obtenerPorId: vi.fn().mockResolvedValue(producto) };
}

// UC-PAY-01 / UC-PAY-04 — un test por criterio de aceptación textual.
describe('MembershipPlanService', () => {
  let auditLog: ReturnType<typeof crearAuditLogFalso>;

  beforeEach(() => {
    auditLog = crearAuditLogFalso();
  });

  describe('crear', () => {
    it('lanza NotFoundException si el producto de catálogo no existe', async () => {
      const db = crearDbFalsa(crearClientFalso([]));
      const productCatalog = productCatalogFalso(null);
      const service = new MembershipPlanService(db as never, auditLog as never, productCatalog as never);

      await expect(
        service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, athleteUserId: ATHLETE_ID, productCatalogId: 'no-existe', currency: 'MXN', billingCycle: 'monthly' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('crea el plan copiando nombre y precio del producto de catálogo (UC-CFG-02)', async () => {
      const producto = { id: PRODUCT_ID, name: 'Mensualidad Sub-15', price: '1200.00' };
      const stubs: QueryStub[] = [
        {
          matcher: /insert into membership_plan/i,
          rows: [{ id: PLAN_ID, name: 'Mensualidad Sub-15', amount: '1200.00', currency: 'MXN', billing_cycle: 'monthly', status: 'active' }],
        },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const productCatalog = productCatalogFalso(producto);
      const service = new MembershipPlanService(db as never, auditLog as never, productCatalog as never);

      const resultado = await service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, athleteUserId: ATHLETE_ID, productCatalogId: PRODUCT_ID, currency: 'MXN', billingCycle: 'monthly' });

      expect(resultado.name).toBe('Mensualidad Sub-15');
      expect(resultado.amount).toBe('1200.00');
      expect(auditLog.record).toHaveBeenCalledOnce();
    });
  });

  describe('cancelar', () => {
    it('lanza NotFoundException si no existe', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from membership_plan where id/i, rows: [] }]));
      const service = new MembershipPlanService(db as never, auditLog as never, productCatalogFalso(null) as never);

      await expect(service.cancelar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, membershipPlanId: 'no-existe' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('cancela sin borrar', async () => {
      const anterior = { id: PLAN_ID, status: 'active' };
      const stubs: QueryStub[] = [
        { matcher: /select \* from membership_plan where id/i, rows: [anterior] },
        { matcher: /update membership_plan set status = 'cancelled'/i, rows: [{ ...anterior, status: 'cancelled' }] },
      ];
      const client = crearClientFalso(stubs);
      const db = crearDbFalsa(client);
      const service = new MembershipPlanService(db as never, auditLog as never, productCatalogFalso(null) as never);

      const resultado = await service.cancelar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, membershipPlanId: PLAN_ID });

      expect(resultado.status).toBe('cancelled');
      const llamadasDelete = (client.query as ReturnType<typeof vi.fn>).mock.calls.filter(([sql]: [string]) => /delete/i.test(sql));
      expect(llamadasDelete).toHaveLength(0);
    });
  });

  describe('aplicarBeca', () => {
    it('un admin de primer nivel (sin scope de beca) no puede aplicar una beca', async () => {
      const db = crearDbFalsa(crearClientFalso([]));
      const service = new MembershipPlanService(db as never, auditLog as never, productCatalogFalso(null) as never);

      await expect(
        service.aplicarBeca({ organizationId: ORG_ID, actorUserId: ACTOR_ID, actorRoles: ['admin'], membershipPlanId: PLAN_ID, scholarshipPct: 25 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('un director (con scope de beca) sí puede aplicarla, y queda auditado', async () => {
      const anterior = { id: PLAN_ID, scholarship_flag: false };
      const stubs: QueryStub[] = [
        { matcher: /select \* from membership_plan where id/i, rows: [anterior] },
        { matcher: /update membership_plan\s+set scholarship_flag = true/i, rows: [{ ...anterior, scholarship_flag: true, scholarship_pct: '25' }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new MembershipPlanService(db as never, auditLog as never, productCatalogFalso(null) as never);

      const resultado = await service.aplicarBeca({ organizationId: ORG_ID, actorUserId: 'director-1', actorRoles: ['director'], membershipPlanId: PLAN_ID, scholarshipPct: 25 });

      expect(resultado.scholarship_flag).toBe(true);
      expect(auditLog.record).toHaveBeenCalledOnce();
    });

    it('lanza NotFoundException si el plan no existe (aun con scope válido)', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from membership_plan where id/i, rows: [] }]));
      const service = new MembershipPlanService(db as never, auditLog as never, productCatalogFalso(null) as never);

      await expect(
        service.aplicarBeca({ organizationId: ORG_ID, actorUserId: 'director-1', actorRoles: ['director'], membershipPlanId: 'no-existe', scholarshipPct: 25 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listar', () => {
    it('regresa los planes de la organización', async () => {
      const stubs: QueryStub[] = [{ matcher: /select \* from membership_plan order by created_at desc/i, rows: [{ id: PLAN_ID }] }];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new MembershipPlanService(db as never, auditLog as never, productCatalogFalso(null) as never);

      const resultado = await service.listar(ORG_ID);

      expect(resultado).toHaveLength(1);
    });
  });
});
