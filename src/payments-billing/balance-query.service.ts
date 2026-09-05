import { ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { GuardianConsentService } from '../identity-access/guardian-consent.service.js';
import type { InvoiceRow, TransactionRow } from './payments-billing.types.js';

export interface ConsultarSaldoInput {
  organizationId: string;
  actorUserId: string;
  actorRoles: string[];
  athleteUserId: string;
}

export interface ConsultarSaldoResultado {
  saldoActual: number;
  invoices: InvoiceRow[];
  transactions: TransactionRow[];
}

// UC-PAY-07 — Consultar saldo e historial de facturas. Actor: "Familia (vista propia) o Admin
// (vista de cualquier cuenta con permiso)".
//
// Brecha cerrada en Fase 6 (Family & Communications, UC-FAM-01: "saldo y facturas" es una de las
// secciones literales del panel familiar consolidado, que solo tiene sentido para un tutor
// verificado). Cuando esto se escribió en Fase 2 no existía `GuardianConsentService.esGuardianDe`
// — ahora sí, así que "vista propia" se amplía a: el propio atleta, un admin/director, O un tutor
// con guardian_link vigente sobre ESE atleta específico (nunca cualquier 'parent' sin verificar).
@Injectable()
export class BalanceQueryService {
  constructor(
    private readonly db: DatabaseService,
    private readonly guardianConsentService: GuardianConsentService,
  ) {}

  async consultar(input: ConsultarSaldoInput): Promise<ConsultarSaldoResultado> {
    const esVistaPropia = input.actorUserId === input.athleteUserId;
    const esStaffConPermiso = input.actorRoles.some((role) => role === 'admin' || role === 'director');
    const esTutorVerificado = esVistaPropia
      ? false
      : await this.guardianConsentService.esGuardianDe(input.organizationId, input.actorUserId, input.athleteUserId);
    if (!esVistaPropia && !esStaffConPermiso && !esTutorVerificado) {
      throw new ForbiddenException('Solo la propia cuenta, un tutor con guardian_link vigente, o un admin/director pueden consultar este saldo.');
    }

    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows: invoices } = await client.query<InvoiceRow>(
        `select * from invoice where athlete_user_id = $1 order by due_date desc`,
        [input.athleteUserId],
      );

      const invoiceIds = invoices.map((invoice) => invoice.id);
      const transactionsResult = invoiceIds.length
        ? await client.query<TransactionRow>(
            `select * from transaction where invoice_id = any($1::uuid[]) order by created_at desc`,
            [invoiceIds],
          )
        : { rows: [] as TransactionRow[] };

      const saldoActual = invoices
        .filter((invoice) => invoice.status === 'pending')
        .reduce((suma, invoice) => suma + Number(invoice.amount_due), 0);

      return { saldoActual, invoices, transactions: transactionsResult.rows };
    });
  }
}
