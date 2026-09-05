'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';
import type { GalleryAssetScope, GalleryAssetType } from '@/lib/types/player-card';

export interface AccionState {
  error: string | null;
}

const ESTADO_OK: AccionState = { error: null };

// UC-PLC-03 — subir requiere media_consent otorgado; el backend rechaza si no existe.
export async function subirAssetAction(_prevState: AccionState, formData: FormData): Promise<AccionState> {
  const scope = String(formData.get('scope') ?? '') as GalleryAssetScope;
  const scopeRefId = String(formData.get('scopeRefId') ?? '');
  const assetUrl = String(formData.get('assetUrl') ?? '').trim();
  const assetType = String(formData.get('assetType') ?? '') as GalleryAssetType;

  try {
    await api.post('/player-card/gallery', { scope, scopeRefId, assetUrl, assetType });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo subir el archivo.' };
  }

  revalidatePath('/player-card/gallery');
  return ESTADO_OK;
}

export async function eliminarAssetAction(assetId: string): Promise<void> {
  await api.post(`/player-card/gallery/${assetId}/delete`);
  revalidatePath('/player-card/gallery');
}
