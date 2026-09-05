import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { VenueService } from './venue.service.js';
import type { VenueStatus } from './calendar-rsvp.types.js';

// [propuesto] — sin actor explícito en el documento fuente (ver venue.service.ts); se gatea como
// una acción administrativa de infraestructura, admin/director.
@Controller('calendar-rsvp/venues')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director')
export class VenueController {
  constructor(private readonly venueService: VenueService) {}

  @Post()
  crear(@CurrentUser() actor: AuthenticatedUser, @Body() body: { name: string }) {
    return this.venueService.crear({ organizationId: actor.organizationId, actorUserId: actor.userId, name: body.name });
  }

  @Post(':id/archive')
  archivar(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.venueService.archivar({ organizationId: actor.organizationId, actorUserId: actor.userId, venueId: id });
  }

  // Lectura abierta a cualquier rol autenticado — el nombre de una sede no es dato restringido;
  // el calendario (UC-CAL-04) lo necesita para mostrarle a cualquier familia/jugador dónde es
  // su evento.
  @Get()
  @Roles('player', 'coach', 'admin', 'parent', 'director')
  listar(@CurrentUser() actor: AuthenticatedUser, @Query('status') status?: VenueStatus) {
    return this.venueService.listar(actor.organizationId, { status });
  }
}
