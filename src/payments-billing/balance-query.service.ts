import { ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
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
// [propuesto, brecha conocida]: "vista propia" se implementa como actorUserId === athleteUserId.
// No se resuelve si un 'parent' es tutor verificado de este atleta específico — eso requeriría
// consultar guardian_link (tabla de Identity & Access) y ese dominio no expone hoy un método para
// "¿es X tutor de Y?". Un padre solo puede consultar el saldo si además tiene rol admin/director;
// dar acceso a cualquier 'parent' sin verificar el vínculo sería un hueco de seguridad real, así
// que se prefirió no implementarlo a medias.
@Injectable()
export class BalanceQueryService {
  constructor(private readonly db: DatabaseService) {}

  async consultar(input: ConsultarSaldoInput): Promise<ConsultarSaldoResultado> {
    const esVistaPropia = input.actorUserId === input.athleteUserId;
    const esStaffConPermiso = input.actorRoles.some((role) => role === 'admin' || role === 'director');
    if (!esVistaPropia && !esStaffConPermiso) {
      throw new ForbiddenException('Solo la propia cuenta o un admin/director pueden consultar este saldo.');
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
