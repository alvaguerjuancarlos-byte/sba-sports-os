import { api } from '@/lib/api';
import { exigirSesion } from '@/lib/session';
import type { MediaConsent } from '@/lib/types/player-card';
import { ConsentActionsForm } from './consent-actions-form';

export default async function MediaConsentPage({ searchParams }: { searchParams: Promise<{ userId?: string }> }) {
  const sesion = await exigirSesion();
  const { userId: userIdParam } = await searchParams;
  const userId = userIdParam || sesion.userId;

  const consent = await api.get<MediaConsent | null>(`/player-card/media-consent/${userId}`);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Consentimiento de medios (UC-PLC-03)</h2>
        <p className="text-sm text-neutral-500">Distinto del consentimiento biométrico — requerido antes de subir fotos/videos a la galería.</p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Gestionar para (userId — vacío para tu propia cuenta)</span>
          <input name="userId" defaultValue={userIdParam ?? ''} placeholder={sesion.userId} className="w-72 rounded border border-neutral-300 px-3 py-2" />
        </label>
        <button type="submit" className="rounded border border-neutral-300 px-3 py-2 text-sm font-medium">
          Consultar
        </button>
      </form>

      <ConsentActionsForm userId={userId} consent={consent} />
    </div>
  );
}
