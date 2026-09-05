import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE } from './lib/session';

// Chequeo optimista de sesión (Next.js recomienda NO usar proxy como única barrera de
// autorización) — solo redirige si falta la cookie por completo. La verificación real de firma
// del JWT ocurre en lib/session.ts (Server Components), y la autorización real por rol la
// aplican los guards de NestJS en cada endpoint — este archivo es UX, no la barrera de seguridad.
export function proxy(request: NextRequest) {
  const tieneSesion = request.cookies.has(SESSION_COOKIE);
  if (!tieneSesion) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/identity/:path*',
    '/config/:path*',
    '/admin-hub/:path*',
    '/payments/:path*',
    '/sports-hub/:path*',
    '/calendar/:path*',
    '/attendance/:path*',
    '/facilities/:path*',
    '/callup-engine/:path*',
    '/match-center/:path*',
    '/weekly-feedback/:path*',
    '/performance/:path*',
    '/player-card/:path*',
    '/crm-enrollment/:path*',
    '/hr-coach-hub/:path*',
    '/family/:path*',
    '/reporting-ai/:path*',
  ],
};
