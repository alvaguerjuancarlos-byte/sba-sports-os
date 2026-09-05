import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import type { CallupFormatRuleRow, CallupFormatRuleStatus } from './callup-engine.types.js';

export interface CrearCallupFormatRuleInput {
  organizationId: string;
  actorUserId: string;
  sport: string;
  format: string;
  maxPlayers: number;
  priorityWindowDays?: number;
}

export interface ArchivarCallupFormatRuleInput {
  organizationId: string;
  actorUserId: string;
  callupFormatRuleId: string;
}

// UC-CUP-06 — Configurar límites de convocatoria por formato/deporte. Mismo patrón que UC-CFG-01
// (Configuration Studio): archivar-no-editar — para cambiar max_players se archiva la regla vieja
// y se crea una nueva, preservando cuál regla aplicó a cada callup_list histórica.
@Injectable()
export class CallupFormatRuleService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

  async crear(input: CrearCallupFormatRuleInput): Promise<CallupFormatRuleRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      let rule: CallupFormatRuleRow;
      try {
        const { rows } = await client.query<CallupFormatRuleRow>(
          `insert into callup_format_rule (organization_id, sport, format, max_players, priority_window_days, status)
           values ($1, $2, $3, $4, $5, 'active')
           returning *`,
          [input.organizationId, input.sport, input.format, input.maxPlayers, input.priorityWindowDays ?? 28],
        );
        rule = rows[0];
      } catch (e) {
        if (this.esViolacionDeUnicidad(e)) {
          throw new ConflictException(`Ya existe una regla activa para '${input.sport}' formato '${input.format}' — archívala antes de crear otra.`);
        }
        throw e;
      }

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'callup_format_rule',
        entityId: rule.id,
        newValue: { sport: rule.sport, format: rule.format, maxPlayers: rule.max_players },
      });

      return rule;
    });
  }

  async archivar(input: ArchivarCallupFormatRuleInput): Promise<CallupFormatRuleRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<CallupFormatRuleRow>(`select * from callup_format_rule where id = $1`, [
        input.callupFormatRuleId,
      ]);
      const anterior = rows[0];
      if (!anterior) throw new NotFoundException('callup_format_rule no encontrada.');

      const { rows: updated } = await client.query<CallupFormatRuleRow>(
        `update callup_format_rule set status = 'archived' where id = $1 returning *`,
        [input.callupFormatRuleId],
      );

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'callup_format_rule',
        entityId: anterior.id,
        fieldChanged: 'status',
        oldValue: { status: anterior.status },
        newValue: { status: 'archived' },
      });

      return updated[0];
    });
  }

  async listar(organizationId: string, opciones: { status?: CallupFormatRuleStatus } = {}): Promise<CallupFormatRuleRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      if (opciones.status) {
        const { rows } = await client.query<CallupFormatRuleRow>(
          `select * from callup_format_rule where status = $1 order by sport, format`,
          [opciones.status],
        );
        return rows;
      }
      const { rows } = await client.query<CallupFormatRuleRow>(`select * from callup_format_rule order by sport, format`);
      return rows;
    });
  }

  // Lectura para el motor de generación (misma dominio, uso interno directo desde
  // CallupListService — no cruza límite de dominio).
  async obtenerActivaPara(organizationId: string, sport: string, format: string): Promise<CallupFormatRuleRow | null> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<CallupFormatRuleRow>(
        `select * from callup_format_rule where sport = $1 and format = $2 and status = 'active'`,
        [sport, format],
      );
      return rows[0] ?? null;
    });
  }

  private esViolacionDeUnicidad(e: unknown): boolean {
    return typeof e === 'object' && e !== null && (e as { code?: string }).code === '23505';
  }
}
