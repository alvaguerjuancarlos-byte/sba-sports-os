import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import { MediaConsentService } from './media-consent.service.js';
import type { GalleryAssetRow, GalleryAssetScope, GalleryAssetType } from './player-card.types.js';

export interface SubirAssetInput {
  organizationId: string;
  actorUserId: string;
  scope: GalleryAssetScope;
  scopeRefId: string;
  assetUrl: string;
  assetType: GalleryAssetType;
}

export interface EliminarAssetInput {
  organizationId: string;
  actorUserId: string;
  assetId: string;
}

// UC-PLC-03, condensado — Subir/gestionar galería.
@Injectable()
export class GalleryService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLog: AuditLogService,
    private readonly mediaConsentService: MediaConsentService,
  ) {}

  async subir(input: SubirAssetInput): Promise<GalleryAssetRow> {
    // "Requiere consentimiento de medios capturado previamente para el atleta/tutor" — solo
    // aplica cuando el scope es un atleta específico; un asset de scope='team' (ej. foto grupal)
    // no tiene un único consentimiento individual que verificar — [propuesto], el documento no
    // cubre este caso.
    if (input.scope === 'athlete') {
      const tieneConsentimiento = await this.mediaConsentService.tieneConsentimientoVigente(input.organizationId, input.scopeRefId);
      if (!tieneConsentimiento) {
        throw new BadRequestException('No se puede subir un asset de galería sin consentimiento de medios vigente para este atleta.');
      }
    }

    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<GalleryAssetRow>(
        `insert into gallery_asset (organization_id, scope, scope_ref_id, asset_url, asset_type, uploaded_by)
         values ($1, $2, $3, $4, $5, $6)
         returning *`,
        [input.organizationId, input.scope, input.scopeRefId, input.assetUrl, input.assetType, input.actorUserId],
      );
      const asset = rows[0];

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'gallery_asset',
        entityId: asset.id,
        newValue: { scope: asset.scope, scopeRefId: asset.scope_ref_id, assetType: asset.asset_type },
      });

      return asset;
    });
  }

  // "Eliminar un asset es una acción auditada, nunca un borrado silencioso" — archivar
  // (active=false), nunca DELETE físico.
  async eliminar(input: EliminarAssetInput): Promise<GalleryAssetRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<GalleryAssetRow>(`select * from gallery_asset where id = $1`, [input.assetId]);
      const anterior = rows[0];
      if (!anterior) throw new NotFoundException('gallery_asset no encontrado.');

      const { rows: updated } = await client.query<GalleryAssetRow>(`update gallery_asset set active = false where id = $1 returning *`, [input.assetId]);

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'gallery_asset',
        entityId: anterior.id,
        fieldChanged: 'active',
        oldValue: { active: true },
        newValue: { active: false },
      });

      return updated[0];
    });
  }

  async listar(organizationId: string, scope: GalleryAssetScope, scopeRefId: string): Promise<GalleryAssetRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<GalleryAssetRow>(
        `select * from gallery_asset where scope = $1 and scope_ref_id = $2 and active = true order by uploaded_at desc`,
        [scope, scopeRefId],
      );
      return rows;
    });
  }
}
