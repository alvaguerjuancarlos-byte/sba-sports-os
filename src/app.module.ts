import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './db/database.module.js';
import { IdentityAccessModule } from './identity-access/identity-access.module.js';
import { ConfigurationStudioModule } from './configuration-studio/configuration-studio.module.js';
import { AdminHubModule } from './admin-hub/admin-hub.module.js';
import { PaymentsBillingModule } from './payments-billing/payments-billing.module.js';
import { SportsHubModule } from './sports-hub/sports-hub.module.js';

@Module({
  imports: [DatabaseModule, IdentityAccessModule, ConfigurationStudioModule, AdminHubModule, PaymentsBillingModule, SportsHubModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
