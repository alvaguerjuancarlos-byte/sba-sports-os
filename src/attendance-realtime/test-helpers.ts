// Utilidad compartida de tests — no es un *.spec.ts, vitest.config.ts solo recoge esos.
import { vi } from 'vitest';
import type { PoolClient } from 'pg';

export interface QueryStub {
  matcher: RegExp;
  rows: Record<string, unknown>[];
}

// Fake de PoolClient por contenido de la query (no por orden de llamada).
export function crearClientFalso(stubs: QueryStub[]): PoolClient {
  const query = vi.fn((sql: string) => {
    const stub = stubs.find((s) => s.matcher.test(sql));
    if (!stub) throw new Error(`Query sin stub configurado: ${sql}`);
    return Promise.resolve({ rows: stub.rows });
  });
  return { query } as unknown as PoolClient;
}

export function crearDbFalsa(client: PoolClient) {
  return {
    withTenant: vi.fn((_organizationId: string, fn: (c: PoolClient) => unknown) => fn(client)),
    query: vi.fn(),
  };
}

export function crearAuditLogFalso() {
  return { record: vi.fn().mockResolvedValue(undefined) };
}
