import { api } from '@/lib/api';
import type { NotificationLog } from '@/lib/types/family-communications';
import { NotificationRow } from './notification-row';

export default async function NotificationsPage() {
  const notificaciones = await api.get<NotificationLog[]>('/family-communications/notifications/inbox');

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-neutral-900">Bandeja de notificaciones (UC-FAM-02)</h2>
      <ul className="flex flex-col gap-2">
        {notificaciones.map((n) => (
          <NotificationRow key={n.id} notification={n} />
        ))}
      </ul>
      {notificaciones.length === 0 && <p className="text-sm text-neutral-500">Sin notificaciones todavía.</p>}
    </div>
  );
}
