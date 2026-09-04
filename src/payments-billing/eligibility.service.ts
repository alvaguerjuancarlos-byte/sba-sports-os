import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { FinancialDimensionsService } from '../configuration-studio/financial-dimensions.service.js';
import { calcularEstadoEfectivo, type InvoiceRow } from './payments-billing.types.js';

export interface ConsultarElegibilidadInput {
  organizationId: string;
  athleteUserId: string;
}

export interface ElegibilidadResultado {
  eligible: boolean;
  blockingInvoiceId?: string;
  paymentLink?: string;
}

// UC-PAY-05 — Evaluar elegibilidad financiera de un atleta. Servicio interno, consumido por otros
// módulos (en particular Call-up Engine, no construido todavía en este repo).
@Injectable()
export class EligibilityService {
  constructor(
    private readonly db: DatabaseService,
    private readonly financialDimensionsService: FinancialDimensionsService,
  ) {}

  // "el sistema responde en tiempo real (no batch nocturno)" — es una consulta normal de request,
  // sin cola/cron de por medio, el requisito se cumple por construcción.
  async consultar(input: ConsultarElegibilidadInput): Promise<ElegibilidadResultado> {
    const facturasPendientes = await this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<InvoiceRow>(
        `select * from invoice where athlete_user_id = $1 and status = 'pending' order by due_date`,
        [input.athleteUserId],
      );
      return rows;
    });

    const hoy = new Date();
    const vencidas = facturasPendientes.filter((f) => calcularEstadoEfectivo(f.status, f.due_date, hoy) === 'overdue');

    for (const factura of vencidas) {
      // 2a. "El saldo vencido existe pero no es de un tipo configurado como cualificante → el
      // sistema responde 'elegible'." Sin dimensión clasificada, nunca bloquea.
      if (!factura.financial_dimension_id) continue;

      const dimension = await this.financialDimensionsService.obtenerPorId(
        input.organizationId,
        factura.financial_dimension_id,
      );
      if (dimension?.is_qualifying_for_block) {
        // Criterio de aceptación: "el banner de pago y el link de pago se generan junto con la
        // respuesta de 'bloqueado', no en un paso separado." [propuesto, diferido]: sin
        // integración real con el proveedor de pagos, el link es un placeholder interno hasta que
        // exista generación real de payment links (Stripe/Adyen).
        return { eligible: false, blockingInvoiceId: factura.id, paymentLink: `/pay/invoices/${factura.id}` };
      }
    }

    return { eligible: true };
  }
}
