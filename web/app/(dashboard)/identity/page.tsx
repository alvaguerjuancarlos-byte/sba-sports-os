import Link from 'next/link';
import { api } from '@/lib/api';
import type { UsuarioDeOrganizacion } from '@/lib/types/identity';

const ETIQUETA_STATUS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  revoked: 'bg-neutral-200 text-neutral-600',
};

export default async function IdentityPage() {
  const usuarios = await api.get<UsuarioDeOrganizacion[]>('/identity/users');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900">Usuarios de la organización</h2>
        <Link href="/identity/new" className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white">
          Nuevo usuario
        </Link>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4">Nombre</th>
            <th className="py-2 pr-4">Email</th>
            <th className="py-2 pr-4">Rol</th>
            <th className="py-2 pr-4">Estado</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.user_tenant_role_id} className="border-b border-neutral-100">
              <td className="py-2 pr-4">{u.full_name}</td>
              <td className="py-2 pr-4 text-neutral-500">{u.email ?? u.phone ?? '—'}</td>
              <td className="py-2 pr-4">{u.role}</td>
              <td className="py-2 pr-4">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${ETIQUETA_STATUS[u.status]}`}>{u.status}</span>
              </td>
              <td className="py-2 text-right">
                <Link href={`/identity/${u.user_id}`} className="text-neutral-600 underline">
                  Ver
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {usuarios.length === 0 && <p className="text-sm text-neutral-500">Sin usuarios todavía.</p>}
    </div>
  );
}
