// Utilidad compartida de tests — no es un *.spec.ts, vitest.config.ts solo recoge esos.
import { vi } from 'vitest';
import type { PoolClient } from 'pg';

export interface QueryStub {
  matcher: RegExp;
  rows: Record<string, unknown>[];
}

// Fake de PoolClient por contenido de la query (no por orden de llamada) — más resistente a
// refactors que encadenar mockResolvedValueOnce en el orden exacto en que el servicio consulta.
export function crearClientFalso(stubs: QueryStub[]): PoolClient {
  const query = vi.fn((sql: string) => {
    const stub = stubs.find((s) => s.matcher.test(sql));
    if (!stub) throw new Error(`Query sin stub configurado: ${sql}`);
    return Promise.resolve({ rows: stub.rows });
  });
  return { query } as unknown as PoolClient;
}

// DatabaseService.withTenant simulado — ignora la mecánica real de transacción/SET LOCAL
// (eso solo se puede probar de verdad contra Postgres, ver plan: "prueba manual de RLS").
export function crearDbFalsa(client: PoolClient) {
  return {
    withTenant: vi.fn((_organizationId: string, fn: (c: PoolClient) => unknown) => fn(client)),
    query: vi.fn(),
  };
}

export function crearAuditLogFalso() {
  return { record: vi.fn().mockResolvedValue(undefined) };
}
