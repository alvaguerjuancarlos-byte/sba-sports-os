import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session';

// Recibe {userId, organizationId} del formulario de /login, llama al login de desarrollo del
// backend (src/auth/dev-login/, ver nota completa ahí sobre por qué esto es temporal), y si
// responde bien guarda el JWT como cookie httpOnly en el origen de Next.js. El navegador nunca ve
// el token en JS — solo en un header Set-Cookie.
export async function POST(request: Request) {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) return NextResponse.json({ message: 'API_URL no está definida.' }, { status: 500 });

  const { userId, organizationId } = await request.json();

  const res = await fetch(`${apiUrl}/auth/dev-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, organizationId }),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) return NextResponse.json(body ?? { message: 'Login de desarrollo falló.' }, { status: res.status });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, body.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60, // 8h, igual que expiresIn del token (dev-login.service.ts)
  });

  return NextResponse.json({ ok: true });
}
