import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { ConversationalAgentService } from './conversational-agent.service.js';

// UC-RPT-06 — Actor: Familia/coach/admin (según su rol). Sin @Roles: el scope real lo resuelve
// cada servicio de dominio al que el agente delega (mismo RLS/scope que la UI normal).
@Controller('reporting-ai/agent')
@UseGuards(JwtAuthGuard)
export class ConversationalAgentController {
  constructor(private readonly service: ConversationalAgentService) {}

  @Post('ask')
  consultar(@CurrentUser() actor: AuthenticatedUser, @Body() body: { mensaje: string; callupSlotId?: string }) {
    return this.service.consultar({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      actorRoles: actor.roles,
      mensaje: body.mensaje,
      callupSlotId: body.callupSlotId,
    });
  }

  // Única vía de ejecución real de una acción propuesta por el agente — nunca automática.
  @Post('confirm')
  confirmar(@CurrentUser() actor: AuthenticatedUser, @Body() body: { accion: 'declinar_convocatoria'; parametros: { callupSlotId: string } }) {
    return this.service.confirmarAccion({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      accion: body.accion,
      parametros: body.parametros,
    });
  }
}
