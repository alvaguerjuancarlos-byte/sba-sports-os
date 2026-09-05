import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import type { NotificationLogRow } from './family-communications.types.js';

// UC-FAM-02, paso 4 — "El destinatario consulta o descarta la notificación desde su bandeja
// in-app." La bandeja es, literalmente, las filas de notification_log con channel='in_app' de
// ese destinatario — no existe una tabla de bandeja separada (ver migración 0016).
@Injectable()
export class NotificationQueryService {
  constructor(private readonly db: DatabaseService) {}

  async listarBandeja(organizationId: string, recipientUserId: string, opciones: { soloNoLeidas?: boolean } = {}): Promise<NotificationLogRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      if (opciones.soloNoLeidas) {
        const { rows } = await client.query<NotificationLogRow>(
          `select * from notification_log where recipient_user_id = $1 and channel = 'in_app' and status = 'unread' order by sent_at desc`,
          [recipientUserId],
        );
        return rows;
      }
      const { rows } = await client.query<NotificationLogRow>(
        `select * from notification_log where recipient_user_id = $1 and channel = 'in_app' order by sent_at desc`,
        [recipientUserId],
      );
      return rows;
    });
  }

  async marcarLeida(organizationId: string, actorUserId: string, notificationLogId: string): Promise<NotificationLogRow> {
    return this.actualizarStatus(organizationId, actorUserId, notificationLogId, 'read');
  }

  async descartar(organizationId: string, actorUserId: string, notificationLogId: string): Promise<NotificationLogRow> {
    return this.actualizarStatus(organizationId, actorUserId, notificationLogId, 'dismissed');
  }

  private async actualizarStatus(organizationId: string, actorUserId: string, notificationLogId: string, status: 'read' | 'dismissed'): Promise<NotificationLogRow> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<NotificationLogRow>(
        `update notification_log set status = $2 where id = $1 and recipient_user_id = $3 returning *`,
        [notificationLogId, status, actorUserId],
      );
      if (!rows[0]) throw new NotFoundException('notification_log no encontrado, o no pertenece a este destinatario.');
      return rows[0];
    });
  }
}
