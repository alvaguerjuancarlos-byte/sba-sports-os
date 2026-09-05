import { api } from '@/lib/api';
import type { GuardianLink } from '@/lib/types/identity';
import { ConsentRow } from './consent-row';

export default async function GuardianConsentsPage() {
  const pendientes = await api.get<GuardianLink[]>('/identity/guardian-links/pending');

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-neutral-900">Consentimientos de tutor pendientes (UC-ID-03)</h2>
      {pendientes.length === 0 ? (
        <p className="text-sm text-neutral-500">No hay consentimientos pendientes.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {pendientes.map((p) => (
            <ConsentRow key={p.id} guardianLinkId={p.id} guardianUserId={p.guardian_user_id} athleteUserId={p.athlete_user_id} />
          ))}
        </ul>
      )}
    </div>
  );
}
