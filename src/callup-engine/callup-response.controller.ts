import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { CallupResponseService } from './callup-response.service.js';

// UC-CUP-02 — Actor: jugador (adulto) o tutor (menor). Sin @Roles (mismo patrón que RSVP y
// consentimiento biométrico) — el gate real vive en CallupResponseService.
@Controller('callup-engine/callup-slots')
@UseGuards(JwtAuthGuard)
export class CallupResponseController {
  constructor(private readonly callupResponseService: CallupResponseService) {}

  @Post(':id/respond')
  responder(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { decision: 'accepted' | 'declined' },
  ) {
    return this.callupResponseService.responder({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      callupSlotId: id,
      decision: body.decision,
    });
  }
}
