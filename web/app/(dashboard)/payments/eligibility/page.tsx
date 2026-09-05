import { api } from '@/lib/api';
import type { UsuarioDeOrganizacion } from '@/lib/types/identity';
import { EligibilityForm } from './eligibility-form';

export default async function EligibilityPage() {
  const usuarios = await api.get<UsuarioDeOrganizacion[]>('/identity/users');
  const atletas = usuarios.filter((u) => u.role === 'player' && u.status === 'active');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Elegibilidad financiera (UC-PAY-05)</h2>
        <p className="text-sm text-neutral-500">Consumido en tiempo real por el Call-up Engine — aquí se expone como consulta manual.</p>
      </div>
      <EligibilityForm atletas={atletas} />
    </div>
  );
}
