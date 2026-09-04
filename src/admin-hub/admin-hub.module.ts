import { Module } from '@nestjs/common';
import { AuditLogModule } from '../shared/audit-log/audit-log.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { VendorService } from './vendor.service.js';
import { VendorController } from './vendor.controller.js';
import { BudgetLineService } from './budget-line.service.js';
import { BudgetLineController } from './budget-line.controller.js';
import { PurchaseRequestService } from './purchase-request.service.js';
import { PurchaseApprovalService } from './purchase-approval.service.js';
import { PurchaseRequestController } from './purchase-request.controller.js';
import { PurchaseOrderService } from './purchase-order.service.js';
import { PurchaseOrderController } from './purchase-order.controller.js';
import { ActualPostingService } from './actual-posting.service.js';
import { ActualPostingController } from './actual-posting.controller.js';
import { BudgetReportService } from './budget-report.service.js';
import { BudgetReportController } from './budget-report.controller.js';

@Module({
  imports: [AuditLogModule, AuthModule],
  controllers: [
    VendorController,
    BudgetLineController,
    PurchaseRequestController,
    PurchaseOrderController,
    ActualPostingController,
    BudgetReportController,
  ],
  providers: [
    VendorService,
    BudgetLineService,
    PurchaseRequestService,
    PurchaseApprovalService,
    PurchaseOrderService,
    ActualPostingService,
    BudgetReportService,
  ],
  exports: [
    VendorService,
    BudgetLineService,
    PurchaseRequestService,
    PurchaseApprovalService,
    PurchaseOrderService,
    ActualPostingService,
    BudgetReportService,
  ],
})
export class AdminHubModule {}
