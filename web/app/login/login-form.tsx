'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEV_PERSONAS, ORG_ID } from '@/lib/dev-personas';

export function LoginForm() {
  const router = useRouter();
  const [personaId, setPersonaId] = useState(DEV_PERSONAS[0].id);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function iniciarSesion() {
    setCargando(true);
    setError(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: personaId, organizationId: ORG_ID }),
    });
    setCargando(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? 'No se pudo iniciar sesión.');
      return;
    }
    router.push('/identity');
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Persona (login de desarrollo)</span>
        <select
          className="rounded border border-neutral-300 px-3 py-2"
          value={personaId}
          onChange={(e) => setPersonaId(e.target.value)}
        >
          {DEV_PERSONAS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.fullName} — {p.role}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={iniciarSesion}
        disabled={cargando}
        className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {cargando ? 'Entrando…' : 'Entrar'}
      </button>
    </div>
  );
}
