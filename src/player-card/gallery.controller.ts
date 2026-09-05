import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { GalleryService } from './gallery.service.js';
import type { GalleryAssetScope, GalleryAssetType } from './player-card.types.js';

// UC-PLC-03, condensado. Actor: "Coach, admin o familia (según scope)".
@Controller('player-card/gallery')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'director', 'coach', 'parent', 'player')
export class GalleryController {
  constructor(private readonly service: GalleryService) {}

  @Post()
  subir(@CurrentUser() actor: AuthenticatedUser, @Body() body: { scope: GalleryAssetScope; scopeRefId: string; assetUrl: string; assetType: GalleryAssetType }) {
    return this.service.subir({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      scope: body.scope,
      scopeRefId: body.scopeRefId,
      assetUrl: body.assetUrl,
      assetType: body.assetType,
    });
  }

  @Post(':assetId/delete')
  eliminar(@CurrentUser() actor: AuthenticatedUser, @Param('assetId') assetId: string) {
    return this.service.eliminar({ organizationId: actor.organizationId, actorUserId: actor.userId, assetId });
  }

  @Get(':scope/:scopeRefId')
  listar(@CurrentUser() actor: AuthenticatedUser, @Param('scope') scope: GalleryAssetScope, @Param('scopeRefId') scopeRefId: string) {
    return this.service.listar(actor.organizationId, scope, scopeRefId);
  }
}
