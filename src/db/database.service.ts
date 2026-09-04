import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, type PoolClient } from 'pg';

// Capa de acceso a Postgres — sin ORM (ver plan de Identity & Access: se descartó Prisma por el
// cambio de paradigma de su CLI v8, que pasó de ORM local a "Prisma Developer Platform" con
// migraciones en la nube). `pg` + SQL parametrizado, control total y sin sorpresas.
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL no está definida — ver .env.example.');
    }
    this.pool = new Pool({ connectionString });
  }

  // Uso fuera de contexto de tenant — `user`/`organization` (globales, sin RLS) o consultas que
  // ya vienen filtradas por otra vía. Para cualquier tabla con `organization_id`, usar
  // withTenant() en vez de esto: sin el SET LOCAL, RLS (FORCE ROW LEVEL SECURITY) bloquea todo.
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ) {
    return this.pool.query<T>(text, params);
  }

  // Abre una transacción, fija app.tenant_id para esta conexión (SET LOCAL — vive solo dentro de
  // la transacción, se descarta automáticamente al hacer commit/rollback, nunca se filtra a la
  // siguiente conexión reusada del pool) y corre el callback contra ese mismo client. Las 3
  // tablas tenant-scoped (user_tenant_role, guardian_link, audit_log) tienen
  // FORCE ROW LEVEL SECURITY — sin este SET LOCAL, cualquier query contra ellas regresa vacío.
  async withTenant<T>(
    organizationId: string,
    fn: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await client.query('select set_config($1, $2, true)', ['app.tenant_id', organizationId]);
      const result = await fn(client);
      await client.query('commit');
      return result;
    } catch (e) {
      await client.query('rollback');
      throw e;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
