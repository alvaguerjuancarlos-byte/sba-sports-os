import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { IdentityAccessModule } from '../../identity-access/identity-access.module.js';
import { DevLoginService } from './dev-login.service.js';
import { DevLoginController } from './dev-login.controller.js';

// LOGIN DE DESARROLLO — ver dev-login.service.ts. Módulo separado de AuthModule (que solo
// CONSUME JWTs) a propósito, para que quede obvio qué archivo borrar el día que se integre
// Auth0/Cognito: este módulo completo, nada más.
@Module({
  imports: [IdentityAccessModule, JwtModule.register({})],
  controllers: [DevLoginController],
  providers: [DevLoginService],
})
export class DevLoginModule {}
