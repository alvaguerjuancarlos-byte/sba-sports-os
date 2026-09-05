import Link from 'next/link';
import { api } from '@/lib/api';
import type { UsuarioDeOrganizacion } from '@/lib/types/identity';

export default async function AccountsPage() {
  const usuarios = await api.get<UsuarioDeOrganizacion[]>('/identity/users');
  const atletas = usuarios.filter((u) => u.role === 'player' && u.status === 'active');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Cuentas y saldo (UC-PAY-07)</h2>
        <p className="text-sm text-neutral-500">Elegir un atleta para ver su saldo, facturas y pagos.</p>
      </div>
      <ul className="flex flex-col gap-2">
        {atletas.map((a) => (
          <li key={a.user_id}>
            <Link href={`/payments/accounts/${a.user_id}`} className="block rounded border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50">
              {a.full_name}
            </Link>
          </li>
        ))}
      </ul>
      {atletas.length === 0 && <p className="text-sm text-neutral-500">Sin atletas activos todavía.</p>}
    </div>
  );
}
