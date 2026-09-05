import { NextResponse } from 'next/server';
import { api } from '@/lib/api';

// UC-CFG-03 (export) — un Route Handler intermedio porque un <a href> del navegador no puede
// llevar el header Authorization; este handler corre en el servidor (misma sesión que cualquier
// Server Component, vía lib/api.ts) y entrega el CSV como descarga real.
export async function GET(request: Request) {
  const entidad = new URL(request.url).searchParams.get('entidad');
  if (entidad !== 'financial-dimensions' && entidad !== 'product-catalog') {
    return NextResponse.json({ message: 'entidad inválida' }, { status: 400 });
  }

  const { csv } = await api.get<{ csv: string }>(`/config/${entidad}/export`);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${entidad}.csv"`,
    },
  });
}
