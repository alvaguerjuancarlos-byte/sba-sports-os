import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

export const SESSION_COOKIE = 'session';

// Misma forma que src/auth/jwt.types.ts (JwtClaims) en el backend — este frontend nunca inventa
// su propio formato de sesión, decodifica el mismo JWT que NestJS ya usa.
export interface Session {
  userId: string;
  organizationId: string;
  roles: string[];
  token: string; // se reenvía tal cual al backend en cada llamada (lib/api.ts)
}

// Verifica la firma con el MISMO JWT_SECRET que el backend (nunca solo decodifica sin verificar)
// — una cookie alterada nunca produce una sesión válida, aunque la cookie sea httpOnly y por lo
// tanto no editable desde JS del navegador; esto es defensa en profundidad, no la única barrera.
export async function obtenerSesion(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET no está definida — ver web/.env.example.');

  try {
    const payload = jwt.verify(token, secret) as { sub: string; org_id: string; roles: string[] };
    return { userId: payload.sub, organizationId: payload.org_id, roles: payload.roles ?? [], token };
  } catch {
    return null;
  }
}

export async function exigirSesion(): Promise<Session> {
  const sesion = await obtenerSesion();
  if (!sesion) throw new Error('No hay sesión activa — este llamador debería haber redirigido a /login antes de llegar aquí.');
  return sesion;
}
