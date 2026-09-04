import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { RolesGuard } from './roles.guard.js';
import { MfaRequiredGuard } from './mfa-required.guard.js';

@Module({
  imports: [PassportModule],
  providers: [JwtStrategy, JwtAuthGuard, RolesGuard, MfaRequiredGuard],
  exports: [JwtAuthGuard, RolesGuard, MfaRequiredGuard],
})
export class AuthModule {}
