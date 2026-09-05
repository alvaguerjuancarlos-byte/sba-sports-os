import Link from 'next/link';
import { redirect } from 'next/navigation';
import { obtenerSesion } from '@/lib/session';
import { LogoutButton } from './logout-button';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const sesion = await obtenerSesion();
  if (!sesion) redirect('/login');

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col gap-4 border-r border-neutral-200 p-4">
        <div>
          <h1 className="text-sm font-semibold text-neutral-900">SBA Sports OS</h1>
          <p className="text-xs text-neutral-500">{sesion.roles.join(', ')}</p>
        </div>
        <nav className="flex flex-col gap-1 text-sm">
          <Link href="/identity" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Usuarios
          </Link>
          <Link href="/identity/guardian-consents" className="rounded px-2 py-1.5 hover:bg-neutral-100">
            Consentimientos pendientes
          </Link>
        </nav>
        <LogoutButton />
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
