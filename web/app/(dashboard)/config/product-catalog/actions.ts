'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';

export interface AccionState {
  error: string | null;
}

const ESTADO_OK: AccionState = { error: null };

// UC-CFG-02 — crear una nueva versión de un producto/servicio del catálogo.
export async function crearVersionProductoAction(_prevState: AccionState, formData: FormData): Promise<AccionState> {
  const productKey = String(formData.get('productKey') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  const price = String(formData.get('price') ?? '');
  const financialDimensionId = String(formData.get('financialDimensionId') ?? '').trim();
  const effectiveDate = String(formData.get('effectiveDate') ?? '');

  try {
    await api.post('/config/product-catalog', {
      productKey: productKey || undefined,
      name,
      price,
      financialDimensionId: financialDimensionId || undefined,
      effectiveDate,
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo crear la versión.' };
  }

  revalidatePath('/config/product-catalog');
  return ESTADO_OK;
}

export async function archivarProductoAction(productKey: string): Promise<void> {
  await api.post(`/config/product-catalog/${productKey}/archive`);
  revalidatePath('/config/product-catalog');
}
