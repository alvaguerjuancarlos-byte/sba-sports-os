'use client';

import { useTransition } from 'react';
import { marcarLeidaAction, descartarAction } from './actions';
import type { NotificationLog } from '@/lib/types/family-communications';

const ESTILO: Record<NotificationLog['status'], string> = {
  unread: 'bg-blue-100 text-blue-800',
  read: 'bg-neutral-200 text-neutral-600',
  dismissed: 'bg-neutral-100 text-neutral-400',
};

export function NotificationRow({ notification }: { notification: NotificationLog }) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between rounded border border-neutral-200 px-3 py-2 text-sm">
      <div>
        <span className={`mr-2 rounded px-2 py-0.5 text-xs font-medium ${ESTILO[notification.status]}`}>{notification.status}</span>
        <span>{notification.notification_type}</span>
        <span className="ml-2 text-xs text-neutral-500">{new Date(notification.sent_at).toLocaleString('es-MX')}</span>
      </div>
      {notification.status === 'unread' && (
        <div className="flex gap-2">
          <button type="button" disabled={pending} onClick={() => startTransition(async () => marcarLeidaAction(notification.id))} className="text-xs text-neutral-700 underline">
            Marcar leída
          </button>
          <button type="button" disabled={pending} onClick={() => startTransition(async () => descartarAction(notification.id))} className="text-xs text-red-600 underline">
            Descartar
          </button>
        </div>
      )}
    </li>
  );
}
