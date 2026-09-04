import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { ProductCatalogService } from './product-catalog.service.js';

// UC-CFG-02 — Actor: Admin financiero o comercial. Alimenta Payments & Billing (UC-PAY-01/02).
@Controller('config/product-catalog')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director')
export class ProductCatalogController {
  constructor(private readonly productCatalogService: ProductCatalogService) {}

  @Post()
  crearVersion(
    @CurrentUser() actor: AuthenticatedUser,
    @Body()
    body: {
      productKey?: string;
      name: string;
      price: string | number;
      financialDimensionId?: string;
      effectiveDate: string;
      attributes?: Record<string, unknown>;
    },
  ) {
    return this.productCatalogService.crearVersion({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      productKey: body.productKey ?? null,
      name: body.name,
      price: body.price,
      financialDimensionId: body.financialDimensionId ?? null,
      effectiveDate: body.effectiveDate,
      attributes: body.attributes ?? null,
    });
  }

  @Post(':productKey/archive')
  archivar(@CurrentUser() actor: AuthenticatedUser, @Param('productKey') productKey: string) {
    return this.productCatalogService.archivar({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      productKey,
    });
  }

  @Get()
  listarActivos(@CurrentUser() actor: AuthenticatedUser) {
    return this.productCatalogService.listarActivos(actor.organizationId);
  }

  @Get(':productKey/history')
  listarHistorico(@CurrentUser() actor: AuthenticatedUser, @Param('productKey') productKey: string) {
    return this.productCatalogService.listarHistorico(actor.organizationId, productKey);
  }
}
