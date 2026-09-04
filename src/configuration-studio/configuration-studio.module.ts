import { Module } from '@nestjs/common';
import { AuditLogModule } from '../shared/audit-log/audit-log.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { FinancialDimensionsService } from './financial-dimensions.service.js';
import { FinancialDimensionsController } from './financial-dimensions.controller.js';
import { ProductCatalogService } from './product-catalog.service.js';
import { ProductCatalogController } from './product-catalog.controller.js';
import { BulkImportService } from './bulk-import.service.js';
import { BulkImportController } from './bulk-import.controller.js';
import { AuditLogQueryService } from './audit-log-query.service.js';
import { AuditLogQueryController } from './audit-log-query.controller.js';

@Module({
  imports: [AuditLogModule, AuthModule],
  controllers: [FinancialDimensionsController, ProductCatalogController, BulkImportController, AuditLogQueryController],
  providers: [FinancialDimensionsService, ProductCatalogService, BulkImportService, AuditLogQueryService],
  exports: [FinancialDimensionsService, ProductCatalogService, BulkImportService, AuditLogQueryService],
})
export class ConfigurationStudioModule {}
