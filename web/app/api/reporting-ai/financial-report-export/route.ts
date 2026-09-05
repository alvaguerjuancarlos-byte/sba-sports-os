import { NextResponse } from 'next/server';
import { exigirSesion } from '@/lib/session';

// UC-RPT-04 (export) — Route Handler intermedio, mismo motivo que config/export/route.ts (un <a
// href> no puede llevar el header Authorization). A diferencia de ese caso, el backend aquí ya
// responde el CSV crudo con Content-Type text/csv (no envuelto en JSON), así que se reenvía la
// respuesta tal cual en vez de usar lib/api.ts (que siempre espera JSON).
export async function GET(request: Request) {
  const sesion = await exigirSesion();
  const apiUrl = process.env.API_URL;
  if (!apiUrl) throw new Error('API_URL no está definida — ver web/.env.example.');

  const { search } = new URL(request.url);
  const res = await fetch(`${apiUrl}/reporting-ai/financial-report/export.csv${search}`, {
    headers: { Authorization: `Bearer ${sesion.token}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    return NextResponse.json({ message: 'No se pudo generar el export.' }, { status: res.status });
  }

  const csv = await res.text();
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="reporte-financiero.csv"',
    },
  });
}
