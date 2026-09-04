import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { TransactionService } from './transaction.service.js';
import { crearAuditLogFalso, crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'admin-1';
const INVOICE_ID = 'inv-1';

// UC-PAY-03 — un test por criterio de aceptación textual.
describe('TransactionService', () => {
  let auditLog: ReturnType<typeof crearAuditLogFalso>;

  beforeEach(() => {
    auditLog = crearAuditLogFalso();
  });

  describe('registrarPago', () => {
    it('lanza NotFoundException si la invoice no existe', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from invoice where id/i, rows: [] }]));
      const service = new TransactionService(db as never, auditLog as never);

      await expect(
        service.registrarPago({ organizationId: ORG_ID, actorUserId: ACTOR_ID, invoiceId: 'no-existe', providerTxnId: 'txn-1', amount: 500, status: 'processed' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('un pago processed actualiza la invoice asociada a paid en el mismo ciclo', async () => {
      const stubs: QueryStub[] = [
        { matcher: /select \* from invoice where id/i, rows: [{ id: INVOICE_ID, status: 'pending' }] },
        { matcher: /insert into transaction/i, rows: [{ id: 'txn-row-1', invoice_id: INVOICE_ID, provider_txn_id: 'txn-1', status: 'processed' }] },
        { matcher: /update invoice set status = 'paid'/i, rows: [] },
      ];
      const client = crearClientFalso(stubs);
      const db = crearDbFalsa(client);
      const service = new TransactionService(db as never, auditLog as never);

      await service.registrarPago({ organizationId: ORG_ID, actorUserId: ACTOR_ID, invoiceId: INVOICE_ID, providerTxnId: 'txn-1', amount: 500, status: 'processed' });

      const llamadaActualizaInvoice = (client.query as ReturnType<typeof vi.fn>).mock.calls.find(([sql]: [string]) =>
        /update invoice set status = 'paid'/i.test(sql),
      );
      expect(llamadaActualizaInvoice).toBeDefined();
      expect(auditLog.record).toHaveBeenCalledOnce();
    });

    it('un pago failed no toca el estado de la invoice', async () => {
      const stubs: QueryStub[] = [
        { matcher: /select \* from invoice where id/i, rows: [{ id: INVOICE_ID, status: 'pending' }] },
        { matcher: /insert into transaction/i, rows: [{ id: 'txn-row-1', invoice_id: INVOICE_ID, provider_txn_id: 'txn-1', status: 'failed' }] },
      ];
      const client = crearClientFalso(stubs);
      const db = crearDbFalsa(client);
      const service = new TransactionService(db as never, auditLog as never);

      await service.registrarPago({ organizationId: ORG_ID, actorUserId: ACTOR_ID, invoiceId: INVOICE_ID, providerTxnId: 'txn-1', amount: 500, status: 'failed' });

      const llamadasActualizanInvoice = (client.query as ReturnType<typeof vi.fn>).mock.calls.filter(([sql]: [string]) =>
        /update invoice/i.test(sql),
      );
      expect(llamadasActualizanInvoice).toHaveLength(0);
    });
  });

  describe('reconciliar', () => {
    it('lanza NotFoundException si la transaction no existe', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from transaction where id/i, rows: [] }]));
      const service = new TransactionService(db as never, auditLog as never);

      await expect(
        service.reconciliar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, transactionId: 'no-existe', estadoReportadoPorProveedor: 'processed' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('sin discrepancia, marca reconciliation_status = ok y no genera alerta', async () => {
      const transaccion = { id: 'txn-1', status: 'processed', reconciliation_status: 'ok' };
      const stubs: QueryStub[] = [
        { matcher: /select \* from transaction where id/i, rows: [transaccion] },
        { matcher: /update transaction set reconciliation_status/i, rows: [{ ...transaccion, reconciliation_status: 'ok' }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new TransactionService(db as never, auditLog as never);

      const resultado = await service.reconciliar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, transactionId: 'txn-1', estadoReportadoPorProveedor: 'processed' });

      expect(resultado.alertaGenerada).toBe(false);
      expect(auditLog.record).not.toHaveBeenCalled();
    });

    it('con discrepancia, marca reconciliation_status = discrepancy y genera alerta, sin sobreescribir status en silencio', async () => {
      const transaccion = { id: 'txn-1', status: 'processed', reconciliation_status: 'ok' };
      const stubs: QueryStub[] = [
        { matcher: /select \* from transaction where id/i, rows: [transaccion] },
        { matcher: /update transaction set reconciliation_status/i, rows: [{ ...transaccion, reconciliation_status: 'discrepancy' }] },
      ];
      const client = crearClientFalso(stubs);
      const db = crearDbFalsa(client);
      const service = new TransactionService(db as never, auditLog as never);

      const resultado = await service.reconciliar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, transactionId: 'txn-1', estadoReportadoPorProveedor: 'failed' });

      expect(resultado.alertaGenerada).toBe(true);
      expect(resultado.transaction.reconciliation_status).toBe('discrepancy');
      const llamadasEditanStatus = (client.query as ReturnType<typeof vi.fn>).mock.calls.filter(([sql]: [string]) =>
        /update transaction set status/i.test(sql),
      );
      expect(llamadasEditanStatus).toHaveLength(0);
      expect(auditLog.record).toHaveBeenCalledOnce();
    });
  });
});
