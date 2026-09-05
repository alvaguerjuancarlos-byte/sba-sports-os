import { exigirSesion } from './session';

// Cliente para el backend NestJS — corre SOLO en el servidor (Server Components, Server Actions,
// Route Handlers), nunca en el navegador. El navegador jamás habla directo con la API; evita
// tocar CORS en NestJS y mantiene el JWT fuera del JS del cliente por completo.
export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(typeof body === 'object' && body !== null && 'message' in body ? String((body as { message: unknown }).message) : `Error HTTP ${status}`);
  }
}

async function llamar<T>(path: string, init?: RequestInit): Promise<T> {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) throw new Error('API_URL no está definida — ver web/.env.example.');

  const sesion = await exigirSesion();
  const res = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sesion.token}`,
      ...init?.headers,
    },
    cache: 'no-store', // datos de administración — nunca servir una respuesta cacheada obsoleta
  });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // sin body (ej. 204)
  }

  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

export const api = {
  get: <T>(path: string) => llamar<T>(path),
  post: <T>(path: string, data?: unknown) => llamar<T>(path, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
};
