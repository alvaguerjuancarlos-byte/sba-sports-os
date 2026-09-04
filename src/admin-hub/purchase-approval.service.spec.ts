import { beforeEach, describe, expect, it } from 'vitest';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PurchaseApprovalService } from './purchase-approval.service.js';
import { crearAuditLogFalso, crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'admin-1';
const PR_ID = 'pr-1';

// UC-ADM-03 — un test por criterio de aceptación textual.
describe('PurchaseApprovalService', () => {
  let auditLog: ReturnType<typeof crearAuditLogFalso>;

  beforeEach(() => {
    auditLog = crearAuditLogFalso();
  });

  describe('aprobar', () => {
    it('lanza NotFoundException si la solicitud no existe', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from purchase_request where id/i, rows: [] }]));
      const service = new PurchaseApprovalService(db as never, auditLog as never);

      await expect(
        service.aprobar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, actorRoles: ['admin'], purchaseRequestId: 'no-existe' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('la decisión es inmutable — no se puede aprobar una solicitud que ya fue decidida', async () => {
      const db = crearDbFalsa(
        crearClientFalso([{ matcher: /select \* from purchase_request where id/i, rows: [{ id: PR_ID, status: 'approved', routing: 'within_budget' }] }]),
      );
      const service = new PurchaseApprovalService(db as never, auditLog as never);

      await expect(
        service.aprobar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, actorRoles: ['admin'], purchaseRequestId: PR_ID }),
      ).rejects.toThrow(ConflictException);
    });

    it('un admin de primer nivel puede aprobar dentro de presupuesto', async () => {
      const solicitud = { id: PR_ID, status: 'pending', routing: 'within_budget' };
      const stubs: QueryStub[] = [
        { matcher: /select \* from purchase_request where id/i, rows: [solicitud] },
        { matcher: /update purchase_request set status = 'approved'/i, rows: [{ ...solicitud, status: 'approved', approved_by: ACTOR_ID }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new PurchaseApprovalService(db as never, auditLog as never);

      const resultado = await service.aprobar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, actorRoles: ['admin'], purchaseRequestId: PR_ID });

      expect(resultado.status).toBe('approved');
      expect(auditLog.record).toHaveBeenCalledOnce();
    });

    it('bloquea a un aprobador de primer nivel intentando aprobar una excepción (alt-flow 4a)', async () => {
      const solicitud = { id: PR_ID, status: 'pending', routing: 'exception' };
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from purchase_request where id/i, rows: [solicitud] }]));
      const service = new PurchaseApprovalService(db as never, auditLog as never);

      await expect(
        service.aprobar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, actorRoles: ['admin'], purchaseRequestId: PR_ID }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('un director sí puede aprobar una excepción (nivel escalado)', async () => {
      const solicitud = { id: PR_ID, status: 'pending', routing: 'exception' };
      const stubs: QueryStub[] = [
        { matcher: /select \* from purchase_request where id/i, rows: [solicitud] },
        { matcher: /update purchase_request set status = 'approved'/i, rows: [{ ...solicitud, status: 'approved' }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new PurchaseApprovalService(db as never, auditLog as never);

      const resultado = await service.aprobar({ organizationId: ORG_ID, actorUserId: 'director-1', actorRoles: ['director'], purchaseRequestId: PR_ID });

      expect(resultado.status).toBe('approved');
    });
  });

  describe('rechazar', () => {
    it('todo rechazo requiere un motivo capturado', async () => {
      const db = crearDbFalsa(crearClientFalso([]));
      const service = new PurchaseApprovalService(db as never, auditLog as never);

      await expect(
        service.rechazar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, purchaseRequestId: PR_ID, rejectionReason: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza NotFoundException si la solicitud no existe', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from purchase_request where id/i, rows: [] }]));
      const service = new PurchaseApprovalService(db as never, auditLog as never);

      await expect(
        service.rechazar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, purchaseRequestId: 'no-existe', rejectionReason: 'Sin presupuesto' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rechaza con motivo y lo audita', async () => {
      const solicitud = { id: PR_ID, status: 'pending', routing: 'within_budget' };
      const stubs: QueryStub[] = [
        { matcher: /select \* from purchase_request where id/i, rows: [solicitud] },
        { matcher: /update purchase_request set status = 'rejected'/i, rows: [{ ...solicitud, status: 'rejected', rejection_reason: 'Sin presupuesto' }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new PurchaseApprovalService(db as never, auditLog as never);

      const resultado = await service.rechazar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, purchaseRequestId: PR_ID, rejectionReason: 'Sin presupuesto' });

      expect(resultado.status).toBe('rejected');
      expect(resultado.rejection_reason).toBe('Sin presupuesto');
      expect(auditLog.record).toHaveBeenCalledOnce();
    });
  });
});
