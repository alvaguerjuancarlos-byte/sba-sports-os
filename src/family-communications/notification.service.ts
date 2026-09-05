import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { NotificationPreferenceService } from './notification-preference.service.js';
import type { NotificationLogRow } from './family-communications.types.js';

// "Notificaciones de pago vencido y de seguridad de cuenta siempre llegan a la bandeja in-app" —
// [propuesto], el documento no da una lista cerrada de tipos "críticos"; en este modelo NINGÚN
// tipo puede evitar la fila in_app (ver nota de la migración 0016), así que esta lista no cambia
// el comportamiento — se deja como documentación de qué tipos existen hoy, no como una condición
// de código.
export type NotificationType = 'payment_reminder' | 'account_security' | 'rsvp_pending' | 'callup' | 'match_live' | 'gallery_upload';

export interface CrearNotificacionInput {
  organizationId: string;
  recipientUserId: string;
  notificationType: NotificationType | string;
  invoiceId?: string | null;
}

// UC-FAM-02 — Recibir y gestionar notificaciones multi-canal (lado de creación/disparo).
//
// Ver nota de alcance completa en la migración 0016_family_communications_init.sql: este
// servicio expone crear() para que OTROS dominios lo llamen en sus propios eventos notificables
// (factura nueva, RSVP pendiente, convocatoria, partido en vivo, galería) — cablear esas llamadas
// dentro de Payments & Billing / Calendar & RSVP / Call-up Engine / Match Center / Player Card es
// trabajo de integración pendiente en esos 5 dominios ya construidos, fuera de alcance de este
// cambio. Se verifica invocando crear() directamente, como lo haría cualquiera de ellos.
@Injectable()
export class NotificationService {
  constructor(
    private readonly db: DatabaseService,
    private readonly preferenceService: NotificationPreferenceService,
  ) {}

  // Criterio de aceptación: "todo evento notificable genera un notification_log, incluso si
  // ningún canal externo está habilitado para el destinatario" — la fila in_app se crea siempre,
  // sin condición; los canales externos se agregan solo si hay preferencia habilitada.
  async crear(input: CrearNotificacionInput): Promise<NotificationLogRow[]> {
    const canalesExternos = await this.preferenceService.listarCanalesExternosHabilitados(
      input.organizationId,
      input.recipientUserId,
      input.notificationType,
    );

    return this.db.withTenant(input.organizationId, async (client) => {
      const filas: NotificationLogRow[] = [];

      const canales = ['in_app', ...canalesExternos];
      for (const canal of canales) {
        const { rows } = await client.query<NotificationLogRow>(
          `insert into notification_log (organization_id, invoice_id, recipient_user_id, channel, notification_type)
           values ($1, $2, $3, $4, $5)
           returning *`,
          [input.organizationId, input.invoiceId ?? null, input.recipientUserId, canal, input.notificationType],
        );
        filas.push(rows[0]);
      }

      return filas;
    });
  }
}
