import { api } from '@/lib/api';
import { listarDirectorio } from '@/lib/identity';
import type { GalleryAsset } from '@/lib/types/player-card';
import type { Team } from '@/lib/types/sports-hub';
import { NewAssetForm } from './new-asset-form';
import { AssetRow } from './asset-row';

export default async function GalleryPage({ searchParams }: { searchParams: Promise<{ scope?: string; scopeRefId?: string }> }) {
  const { scope, scopeRefId } = await searchParams;
  const [directorio, equipos] = await Promise.all([listarDirectorio(), api.get<Team[]>('/sports-hub/teams')]);
  const atletas = directorio.filter((u) => u.role === 'player' && u.status === 'active');
  const equiposActivos = equipos.filter((t) => t.status === 'active');

  const assets = scope && scopeRefId ? await api.get<GalleryAsset[]>(`/player-card/gallery/${scope}/${scopeRefId}`) : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Galería (UC-PLC-03)</h2>
        <p className="text-sm text-neutral-500">Subir requiere consentimiento de medios otorgado — el backend rechaza si no existe.</p>
      </div>
      <NewAssetForm atletas={atletas} equipos={equiposActivos} />

      {scope && scopeRefId && (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="py-2 pr-4">Tipo</th>
              <th className="py-2 pr-4">Archivo</th>
              <th className="py-2 pr-4">Subido</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <AssetRow key={a.id} asset={a} />
            ))}
          </tbody>
        </table>
      )}
      {scope && scopeRefId && assets.length === 0 && <p className="text-sm text-neutral-500">Sin archivos todavía para este destino.</p>}
    </div>
  );
}
