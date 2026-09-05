import { api } from './api';
import type { UsuarioDeDirectorio } from './types/identity';

// GET /identity/users/directory — accesible a admin/director/coach, sin PII (email/teléfono/
// fecha de nacimiento). Usar en pantallas de otros dominios (roster, check-ins, checkouts,
// convocatoria, centro de partido) que solo necesitan resolver un nombre o poblar un selector.
export async function listarDirectorio(): Promise<UsuarioDeDirectorio[]> {
  return api.get<UsuarioDeDirectorio[]>('/identity/users/directory');
}
