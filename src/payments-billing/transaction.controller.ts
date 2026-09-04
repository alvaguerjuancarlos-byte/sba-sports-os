import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { TransactionService } from './transaction.service.js';
import type { TransactionStatus } from './payments-billing.types.js';

// UC-PAY-03 — Actor real: "Familia/tutor (paga)" vía un link de pago hospedado por el proveedor —
// eso no toca esta API en absoluto (el proveedor cobra y notifica vía webhook). Esta ruta cubre el
// otro actor explícito, "Admin (registra pago recibido por otro medio)" — un endpoint de webhook
// real (sin JWT de usuario, verificado por firma del proveedor) es la integración de Stripe/Adyen
// todavía no construida; no se expone aquí un endpoint sin autenticación que cualquiera pudiera
// usar para fabricar pagos.
@Controller('payments/transactions')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  registrarPago(
    @CurrentUser() actor: AuthenticatedUser,
    @Body()
    body: { invoiceId: string; providerTxnId: string; amount: string | number; feeAmount?: string | number; status: TransactionStatus },
  ) {
    return this.transactionService.registrarPago({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      invoiceId: body.invoiceId,
      providerTxnId: body.providerTxnId,
      amount: body.amount,
      feeAmount: body.feeAmount ?? null,
      status: body.status,
    });
  }

  @Post(':id/reconcile')
  reconciliar(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { estadoReportadoPorProveedor: TransactionStatus },
  ) {
    return this.transactionService.reconciliar({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      transactionId: id,
      estadoReportadoPorProveedor: body.estadoReportadoPorProveedor,
    });
  }
}
