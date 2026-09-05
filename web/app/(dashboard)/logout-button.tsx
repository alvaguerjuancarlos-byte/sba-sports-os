'use client';

import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();

  async function salir() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <button type="button" onClick={salir} className="mt-auto rounded px-2 py-1.5 text-left text-sm text-neutral-500 hover:bg-neutral-100">
      Cerrar sesión
    </button>
  );
}
