import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import type { NotificationChannel, NotificationPreferenceRow } from './family-communications.types.js';

export interface ConfigurarPreferenciaInput {
  organizationId: string;
  actorUserId: string; // siempre el propio usuario — configurar la preferencia de otro no aplica
  notificationType: string;
  channel: Exclude<NotificationChannel, 'in_app'>;
  enabled: boolean;
}

// UC-FAM-03, condensado — Configurar preferencias de notificación. `in_app` nunca es
// configurable — ver nota de alcance en la migración 0016 (la fila de notification_log ES la
// bandeja in-app, no un canal que se pueda desactivar por preferencia).
@Injectable()
export class NotificationPreferenceService {
  constructor(private readonly db: DatabaseService) {}

  async configurar(input: ConfigurarPreferenciaInput): Promise<NotificationPreferenceRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<NotificationPreferenceRow>(
        `insert into notification_preference (organization_id, user_id, notification_type, channel, enabled)
         values ($1, $2, $3, $4, $5)
         on conflict (organization_id, user_id, notification_type, channel) do update set
           enabled = excluded.enabled,
           updated_at = now()
         returning *`,
        [input.organizationId, input.actorUserId, input.notificationType, input.channel, input.enabled],
      );
      return rows[0];
    });
  }

  async listarPorUsuario(organizationId: string, userId: string): Promise<NotificationPreferenceRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<NotificationPreferenceRow>(
        `select * from notification_preference where user_id = $1 order by notification_type, channel`,
        [userId],
      );
      return rows;
    });
  }

  // Lectura para NotificationService (mismo dominio) — canales EXTERNOS (push/email)
  // habilitados para este destinatario y tipo. Sin preferencia configurada = no habilitado, nunca
  // se asume opt-in por omisión (RFP §8, LFPDPPP como marco vinculante).
  async listarCanalesExternosHabilitados(organizationId: string, userId: string, notificationType: string): Promise<Exclude<NotificationChannel, 'in_app'>[]> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<{ channel: Exclude<NotificationChannel, 'in_app'> }>(
        `select channel from notification_preference
         where user_id = $1 and notification_type = $2 and channel != 'in_app' and enabled = true`,
        [userId, notificationType],
      );
      return rows.map((r) => r.channel);
    });
  }
}
