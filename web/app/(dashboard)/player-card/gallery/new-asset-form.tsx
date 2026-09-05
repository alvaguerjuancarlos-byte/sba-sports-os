'use client';

import { useActionState } from 'react';
import { subirAssetAction } from './actions';
import type { AccionState } from './actions';
import type { UsuarioDeDirectorio } from '@/lib/types/identity';
import type { Team } from '@/lib/types/sports-hub';

const ESTADO_INICIAL: AccionState = { error: null };

export function NewAssetForm({ atletas, equipos }: { atletas: UsuarioDeDirectorio[]; equipos: Team[] }) {
  const [state, formAction, pending] = useActionState(subirAssetAction, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Destino</span>
        <select
          name="destino"
          required
          defaultValue=""
          className="w-56 rounded border border-neutral-300 px-3 py-2"
          onChange={(e) => {
            const form = e.target.form!;
            const [scope, scopeRefId] = e.target.value.split(':');
            (form.elements.namedItem('scope') as HTMLInputElement).value = scope ?? '';
            (form.elements.namedItem('scopeRefId') as HTMLInputElement).value = scopeRefId ?? '';
          }}
        >
          <option value="" disabled>
            — elegir —
          </option>
          <optgroup label="Atletas">
            {atletas.map((a) => (
              <option key={a.user_id} value={`athlete:${a.user_id}`}>
                {a.full_name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Equipos">
            {equipos.map((t) => (
              <option key={t.id} value={`team:${t.id}`}>
                {t.name}
              </option>
            ))}
          </optgroup>
        </select>
      </label>
      <input type="hidden" name="scope" />
      <input type="hidden" name="scopeRefId" />
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Tipo</span>
        <select name="assetType" defaultValue="photo" className="rounded border border-neutral-300 px-3 py-2">
          <option value="photo">Foto</option>
          <option value="video">Video</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">URL del archivo</span>
        <input name="assetUrl" type="url" required placeholder="https://…" className="w-64 rounded border border-neutral-300 px-3 py-2" />
      </label>
      <button type="submit" disabled={pending} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Subiendo…' : 'Subir'}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
