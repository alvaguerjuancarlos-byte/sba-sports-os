import { api } from '@/lib/api';
import { exigirSesion } from '@/lib/session';
import type { MembershipPlan } from '@/lib/types/payments-billing';
import type { UsuarioDeOrganizacion } from '@/lib/types/identity';
import type { ProductCatalogItem } from '@/lib/types/configuration-studio';
import { NewMembershipPlanForm } from './new-membership-plan-form';
import { MembershipPlanRow } from './membership-plan-row';

export default async function MembershipPlansPage() {
  const [sesion, planes, usuarios, productos] = await Promise.all([
    exigirSesion(),
    api.get<MembershipPlan[]>('/payments/membership-plans'),
    api.get<UsuarioDeOrganizacion[]>('/identity/users'),
    api.get<ProductCatalogItem[]>('/config/product-catalog'),
  ]);
  const atletas = usuarios.filter((u) => u.role === 'player' && u.status === 'active');
  const nombrePorAtleta = new Map(usuarios.map((u) => [u.user_id, u.full_name]));
  const esDirector = sesion.roles.includes('director');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Planes de membresía (UC-PAY-01/04)</h2>
        <p className="text-sm text-neutral-500">Aplicar beca requiere el scope de director — el resto de los roles ven el plan sin ese detalle.</p>
      </div>
      <NewMembershipPlanForm atletas={atletas} productosActivos={productos} />
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4">Atleta</th>
            <th className="py-2 pr-4">Plan</th>
            <th className="py-2 pr-4">Monto</th>
            <th className="py-2 pr-4">Estado</th>
            <th className="py-2 pr-4">Beca</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {planes.map((p) => (
            <MembershipPlanRow key={p.id} plan={p} nombreAtleta={nombrePorAtleta.get(p.athlete_user_id) ?? '—'} esDirector={esDirector} />
          ))}
        </tbody>
      </table>
      {planes.length === 0 && <p className="text-sm text-neutral-500">Sin planes de membresía todavía.</p>}
    </div>
  );
}
