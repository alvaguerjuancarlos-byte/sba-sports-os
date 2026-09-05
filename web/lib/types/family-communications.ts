// Espejo de src/family-communications/family-communications.types.ts (backend).
export type NotificationChannel = 'push' | 'in_app' | 'email';

export interface NotificationLog {
  id: string;
  organization_id: string;
  invoice_id: string | null;
  recipient_user_id: string;
  channel: string;
  notification_type: string;
  status: 'unread' | 'read' | 'dismissed';
  sent_at: string;
}

export interface NotificationPreference {
  id: string;
  organization_id: string;
  user_id: string;
  notification_type: string;
  channel: NotificationChannel;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface PanelDeAtleta {
  athleteId: string;
  saldo: { restricted: boolean; data: { saldoActual: number } | null };
  calendario: { restricted: boolean; data: { events: { id: string; type: string; start_at: string }[] } | null };
  galeria: { restricted: boolean; data: { assets: { id: string; asset_url: string; asset_type: string }[] } | null };
}
