import { api } from '@/lib/api';
import type { UsuarioDeOrganizacion } from '@/lib/types/identity';
import { AssignRoleForm } from './assign-role-form';
import { RevokeButton } from './revoke-button';

export default async function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  // Sin un endpoint dedicado "roles de un user" expuesto todavía — se reutiliza el listado de la
  // organización y se filtra aquí. Para el tamaño de esta organización de desarrollo es
  // suficiente; si esto crece, agregar GET /identity/users/:userId/roles en el backend.
  const usuarios = await api.get<UsuarioDeOrganizacion[]>('/identity/users');
  const filas = usuarios.filter((u) => u.user_id === userId);

  if (filas.length === 0) {
    return <p className="text-sm text-neutral-500">No se encontró este usuario en la organización.</p>;
  }

  const { full_name, email, phone, date_of_birth } = filas[0];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">{full_name}</h2>
        <p className="text-sm text-neutral-500">
          {email ?? phone} · nacido {date_of_birth}
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Roles en esta organización</h3>
        <ul className="flex flex-col gap-2">
          {filas.map((f) => (
            <li key={f.user_tenant_role_id} className="flex items-center justify-between rounded border border-neutral-200 px-3 py-2 text-sm">
              <span>
                {f.role} — <span className="text-neutral-500">{f.status}</span>
              </span>
              {f.status === 'active' && <RevokeButton userTenantRoleId={f.user_tenant_role_id} userId={userId} />}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Asignar rol adicional (UC-ID-02)</h3>
        <AssignRoleForm userId={userId} />
      </div>
    </div>
  );
}
