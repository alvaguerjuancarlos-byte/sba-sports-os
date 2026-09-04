import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { BulkImportService, type EntidadImportable } from './bulk-import.service.js';
import { parsearCsv } from './csv.util.js';

type EntidadRuta = 'financial-dimensions' | 'product-catalog';

function aEntidadInterna(entidad: EntidadRuta): EntidadImportable {
  return entidad === 'financial-dimensions' ? 'financial_dimension' : 'product_catalog';
}

// UC-CFG-03 — Importar/exportar catálogo o dimensión. El cuerpo recibe el CSV como texto plano
// (no multipart/form-data) — subir el archivo desde un formulario es responsabilidad del frontend,
// fuera del alcance backend-only de este dominio.
@Controller('config')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director')
export class BulkImportController {
  constructor(private readonly bulkImportService: BulkImportService) {}

  @Post(':entidad/import')
  importar(@CurrentUser() actor: AuthenticatedUser, @Param('entidad') entidad: EntidadRuta, @Body() body: { csv: string }) {
    const filas = parsearCsv(body.csv);
    return this.bulkImportService.importarLote({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      entidad: aEntidadInterna(entidad),
      filas,
    });
  }

  @Get(':entidad/export')
  async exportar(@CurrentUser() actor: AuthenticatedUser, @Param('entidad') entidad: EntidadRuta) {
    const csv = await this.bulkImportService.exportarCsv(actor.organizationId, aEntidadInterna(entidad));
    return { csv };
  }
}
