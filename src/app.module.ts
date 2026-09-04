import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './db/database.module.js';
import { IdentityAccessModule } from './identity-access/identity-access.module.js';
import { ConfigurationStudioModule } from './configuration-studio/configuration-studio.module.js';

@Module({
  imports: [DatabaseModule, IdentityAccessModule, ConfigurationStudioModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
