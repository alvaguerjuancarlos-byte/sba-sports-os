import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import type { ProspectRow, ProspectStage } from './crm-enrollment.types.js';

export interface CrearProspectoInput {
  organizationId: string;
  actorUserId: string;
  name: string;
  contactInfo: string;
  source: string;
  tags?: string[];
  assignedTo?: string | null;
}

export interface CambiarStageInput {
  organizationId: string;
  actorUserId: string;
  prospectId: string;
  stage: ProspectStage;
}

// UC-CRM-01 — Registrar prospecto y dar seguimiento en el funnel.
@Injectable()
export class ProspectService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

  async crear(input: CrearProspectoInput): Promise<ProspectRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<ProspectRow>(
        `insert into prospect (organization_id, name, contact_info, source, tags, assigned_to, stage)
         values ($1, $2, $3, $4, $5, $6, 'lead')
         returning *`,
        [input.organizationId, input.name, input.contactInfo, input.source, JSON.stringify(input.tags ?? []), input.assignedTo ?? null],
      );
      const prospecto = rows[0];

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'prospect',
        entityId: prospecto.id,
        newValue: { name: prospecto.name, source: prospecto.source, stage: prospecto.stage },
      });

      return prospecto;
    });
  }

  // Criterio de aceptación: "todo cambio de stage de un prospect queda con fecha, sin excepción,
  // incluso si el prospecto se pierde" — se satisface vía audit_log (occurred_at), no una columna
  // propia de historial (ver nota de alcance en la migración 0014).
  // 3a: se permite CUALQUIER salto de stage (ej. lead -> won directo) — el UC lo permite
  // explícitamente, así que no se valida una máquina de estados aquí.
  async cambiarStage(input: CambiarStageInput): Promise<ProspectRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<ProspectRow>(`select * from prospect where id = $1`, [input.prospectId]);
      const anterior = rows[0];
      if (!anterior) throw new NotFoundException('prospect no encontrado.');

      const { rows: updated } = await client.query<ProspectRow>(
        `update prospect set stage = $2, updated_at = now() where id = $1 returning *`,
        [input.prospectId, input.stage],
      );

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'prospect',
        entityId: anterior.id,
        fieldChanged: 'stage',
        oldValue: { stage: anterior.stage },
        newValue: { stage: input.stage },
      });

      return updated[0];
    });
  }

  async listar(organizationId: string, opciones: { stage?: ProspectStage } = {}): Promise<ProspectRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      if (opciones.stage) {
        const { rows } = await client.query<ProspectRow>(`select * from prospect where stage = $1 order by created_at desc`, [opciones.stage]);
        return rows;
      }
      const { rows } = await client.query<ProspectRow>(`select * from prospect order by created_at desc`);
      return rows;
    });
  }

  async obtenerPorId(organizationId: string, prospectId: string): Promise<ProspectRow | null> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<ProspectRow>(`select * from prospect where id = $1`, [prospectId]);
      return rows[0] ?? null;
    });
  }

  // Lectura/escritura interna para EnrollmentService (UC-CRM-03) — nunca hace SELECT/UPDATE
  // directo contra prospect.
  async marcarConvertido(organizationId: string, actorUserId: string, prospectId: string): Promise<ProspectRow> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<ProspectRow>(
        `update prospect set stage = 'won', converted_at = now(), updated_at = now() where id = $1 returning *`,
        [prospectId],
      );
      const prospecto = rows[0];
      if (!prospecto) throw new NotFoundException('prospect no encontrado.');

      await this.auditLog.record(client, {
        organizationId,
        actorUserId,
        entityType: 'prospect',
        entityId: prospecto.id,
        fieldChanged: 'stage',
        newValue: { stage: 'won', converted: true },
      });

      return prospecto;
    });
  }
}
