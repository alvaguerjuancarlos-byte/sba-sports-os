import { api } from '@/lib/api';
import type { NotificationPreference } from '@/lib/types/family-communications';
import { NewPreferenceForm } from './new-preference-form';

export default async function NotificationPreferencesPage() {
  const preferencias = await api.get<NotificationPreference[]>('/family-communications/notification-preferences');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Preferencias de notificación (UC-FAM-03)</h2>
        <p className="text-sm text-neutral-500">La bandeja in-app siempre se genera — estas preferencias solo controlan los canales externos.</p>
      </div>
      <NewPreferenceForm />
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4">Tipo</th>
            <th className="py-2 pr-4">Canal</th>
            <th className="py-2 pr-4">Habilitado</th>
          </tr>
        </thead>
        <tbody>
          {preferencias.map((p) => (
            <tr key={p.id} className="border-b border-neutral-100">
              <td className="py-2 pr-4">{p.notification_type}</td>
              <td className="py-2 pr-4">{p.channel}</td>
              <td className="py-2 pr-4">{p.enabled ? 'Sí' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {preferencias.length === 0 && <p className="text-sm text-neutral-500">Sin preferencias configuradas todavía.</p>}
    </div>
  );
}
