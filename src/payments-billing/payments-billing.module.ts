import { Module } from '@nestjs/common';
import { AuditLogModule } from '../shared/audit-log/audit-log.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ConfigurationStudioModule } from '../configuration-studio/configuration-studio.module.js';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { MembershipPlanService } from './membership-plan.service.js';
import { MembershipPlanController } from './membership-plan.controller.js';
import { InvoiceService } from './invoice.service.js';
import { InvoiceController } from './invoice.controller.js';
import { TransactionService } from './transaction.service.js';
import { TransactionController } from './transaction.controller.js';
import { EligibilityService } from './eligibility.service.js';
import { EligibilityController } from './eligibility.controller.js';
import { CollectionsService } from './collections.service.js';
import { CollectionsController } from './collections.controller.js';
import { BalanceQueryService } from './balance-query.service.js';
import { BalanceController } from './balance.controller.js';

// Depende de ConfigurationStudioModule para leer/copiar datos de product_catalog (UC-PAY-01/02) y
// de financial_dimension.is_qualifying_for_block (UC-PAY-05), y de IdentityAccessModule para
// verificar guardian_link (UC-PAY-07, ver balance-query.service.ts) — siempre vía sus servicios
// exportados, nunca con SELECT directo a las tablas de esos dominios.
@Module({
  imports: [AuditLogModule, AuthModule, ConfigurationStudioModule, IdentityAccessModule],
  controllers: [
    MembershipPlanController,
    InvoiceController,
    TransactionController,
    EligibilityController,
    CollectionsController,
    BalanceController,
  ],
  providers: [MembershipPlanService, InvoiceService, TransactionService, EligibilityService, CollectionsService, BalanceQueryService],
  exports: [MembershipPlanService, InvoiceService, TransactionService, EligibilityService, CollectionsService, BalanceQueryService],
})
export class PaymentsBillingModule {}
