import { Body, Controller, Post } from '@nestjs/common';
import { DevLoginService } from './dev-login.service.js';

// Sin guards a propósito — es el punto de entrada ANTES de tener sesión. Ver la nota completa en
// dev-login.service.ts sobre por qué esto es temporal y nunca debe existir fuera de desarrollo
// local.
@Controller('auth/dev-login')
export class DevLoginController {
  constructor(private readonly devLoginService: DevLoginService) {}

  @Post()
  emitirToken(@Body() body: { userId: string; organizationId: string }) {
    return this.devLoginService.emitirToken({ userId: body.userId, organizationId: body.organizationId });
  }
}
