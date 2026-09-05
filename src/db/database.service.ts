import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, types, type PoolClient } from 'pg';

// `pg` parsea columnas `date` (OID 1082) a un objeto JS Date por defecto, a medianoche LOCAL
// convertida a UTC — ej. '2020-01-01' en una máquina UTC-6 vuelve como
// '2020-01-01T06:00:00.000Z'. Todo el dominio (UserRow.date_of_birth, ProductCatalogRow
// .effective_date/.effective_until, InvoiceRow.due_date) asume que estas columnas llegan como
// string 'YYYY-MM-DD' — la comparación de cadenas en calcularEstadoEfectivo() y
// crearVersionProductoEnTransaccion() depende de eso literalmente. Verificado contra Postgres
// real: sin este override, una factura vencida nunca se detectaba como overdue porque
// `dueDateComoObjeto < '2026-09-04'` compara el Date convertido a string largo
// ("Wed Jan 01 2020...") contra una fecha ISO, no dos fechas ISO — casi siempre falso. Se
// desactiva el parser aquí, una sola vez al cargar este módulo, antes de que exista cualquier Pool.
types.setTypeParser(types.builtins.DATE, (value: string) => value);

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
  // la transacción, se descarta al hacer commit/rollback) y corre el callback contra ese mismo
  // client. Todas las tablas tenant-scoped tienen FORCE ROW LEVEL SECURITY — sin este SET LOCAL,
  // cualquier query contra ellas queda aislada (nunca hay fuga entre tenants), verificado contra
  // Postgres real: en una conexión NUEVA, current_setting(...) da NULL y la política filtra en
  // silencio a 0 filas; pero en una conexión del pool que YA usó SET LOCAL antes, el valor no
  // vuelve a NULL tras el commit sino a '' — el cast `''::uuid` de la política lanza un error en
  // vez de regresar vacío. Mismo resultado de seguridad (ningún dato cruza de tenant), solo
  // cambia si el fallo es silencioso o con excepción según si la conexión es nueva o reusada. No
  // afecta a este código porque query() (sin SET LOCAL) solo se usa para organization/user, que no
  // llevan RLS — pero cualquier query futura contra una tabla con RLS fuera de withTenant() debe
  // esperar un error, no una lista vacía, si corre en una conexión ya usada por otro tenant.
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
