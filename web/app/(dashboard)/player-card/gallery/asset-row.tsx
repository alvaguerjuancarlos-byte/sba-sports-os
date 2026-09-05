'use client';

import { useTransition } from 'react';
import { eliminarAssetAction } from './actions';
import type { GalleryAsset } from '@/lib/types/player-card';

export function AssetRow({ asset }: { asset: GalleryAsset }) {
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b border-neutral-100">
      <td className="py-2 pr-4">{asset.asset_type === 'photo' ? 'Foto' : 'Video'}</td>
      <td className="py-2 pr-4">
        <a href={asset.asset_url} target="_blank" rel="noreferrer" className="text-neutral-700 underline">
          {asset.asset_url}
        </a>
      </td>
      <td className="py-2 pr-4 text-neutral-500">{new Date(asset.uploaded_at).toLocaleDateString('es-MX')}</td>
      <td className="py-2 text-right">
        <button type="button" disabled={pending} onClick={() => startTransition(async () => eliminarAssetAction(asset.id))} className="text-xs text-red-600 underline">
          Eliminar
        </button>
      </td>
    </tr>
  );
}
