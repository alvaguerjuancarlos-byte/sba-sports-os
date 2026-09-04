import { Module } from '@nestjs/common';
import { AuditLogModule } from '../shared/audit-log/audit-log.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { GuardianConsentService } from './guardian-consent.service.js';
import { GuardianConsentController } from './guardian-consent.controller.js';
import { AccessRevocationService } from './access-revocation.service.js';
import { AccessRevocationController } from './access-revocation.controller.js';

@Module({
  imports: [AuditLogModule, AuthModule],
  controllers: [UsersController, GuardianConsentController, AccessRevocationController],
  providers: [UsersService, GuardianConsentService, AccessRevocationService],
  exports: [UsersService, GuardianConsentService, AccessRevocationService],
})
export class IdentityAccessModule {}
