import Link from 'next/link';
import { exigirSesion } from '@/lib/session';
import { listarDirectorio } from '@/lib/identity';

export default async function PlayerCardIndexPage() {
  const sesion = await exigirSesion();
  const esStaff = sesion.roles.includes('admin') || sesion.roles.includes('director') || sesion.roles.includes('coach');

  if (!esStaff) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-neutral-900">Mi Player Card</h2>
        <Link href={`/player-card/${sesion.userId}`} className="w-fit rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white">
          Ver mi tarjeta
        </Link>
      </div>
    );
  }

  const directorio = await listarDirectorio();
  const atletas = directorio.filter((u) => u.role === 'player' && u.status === 'active');

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-neutral-900">Player Card</h2>
      <ul className="flex flex-col gap-2">
        {atletas.map((a) => (
          <li key={a.user_id}>
            <Link href={`/player-card/${a.user_id}`} className="block rounded border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50">
              {a.full_name}
            </Link>
          </li>
        ))}
      </ul>
      {atletas.length === 0 && <p className="text-sm text-neutral-500">Sin atletas activos todavía.</p>}
    </div>
  );
}
