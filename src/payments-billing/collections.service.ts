import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { calcularEstadoEfectivo, type InvoiceRow, type NotificationLogRow } from './payments-billing.types.js';

// UC-PAY-06 — Gestión de cobranza sobre saldo vencido (condensado). En Fase 2 se implementa como
// "notificación programada estándar (sin agente autónomo todavía)" — este método hace el trabajo
// de generar los recordatorios; conectarlo a un scheduler real (ej. @nestjs/schedule, un cron) es
// una decisión de infraestructura/ops fuera de esta pieza de lógica de negocio, no de este cambio.
@Injectable()
export class CollectionsService {
  constructor(private readonly db: DatabaseService) {}

  async generarRecordatorios(organizationId: string): Promise<NotificationLogRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows: pendientes } = await client.query<InvoiceRow>(`select * from invoice where status = 'pending'`);
      const hoy = new Date();
      const vencidas = pendientes.filter((f) => calcularEstadoEfectivo(f.status, f.due_date, hoy) === 'overdue');

      const recordatorios: NotificationLogRow[] = [];
      for (const factura of vencidas) {
        const { rows } = await client.query<NotificationLogRow>(
          `insert into notification_log (organization_id, invoice_id, recipient_user_id, channel)
           values ($1, $2, $3, 'email')
           returning *`,
          [organizationId, factura.id, factura.athlete_user_id],
        );
        recordatorios.push(rows[0]);
      }
      return recordatorios;
    });
  }
}
