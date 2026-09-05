// Tipos de fila — reflejan db/migrations/0016_family_communications_init.sql.
export type { NotificationLogRow } from '../payments-billing/payments-billing.types.js';

export type NotificationChannel = 'push' | 'in_app' | 'email';

export interface NotificationPreferenceRow {
  id: string;
  organization_id: string;
  user_id: string;
  notification_type: string;
  channel: NotificationChannel;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}
