// Runner de migraciones SQL — mínimo a propósito (sin ORM, ver plan de Identity & Access:
// se descartó Prisma por el cambio de paradigma de su CLI v8, ver commit de este archivo).
// Aplica en orden alfabético cada .sql de db/migrations/ que no esté ya en schema_migrations,
// una por transacción. No hace rollback automático de migraciones ya aplicadas — igual que
// cualquier migrador de SQL plano, corregir hacia adelante con una migración nueva.
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import pg from 'pg'

const { Client } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.join(__dirname, '..', 'db', 'migrations')

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL no está definida — ver .env.example.')
  process.exit(1)
}

const client = new Client({ connectionString })
await client.connect()

try {
  await client.query(`
    create table if not exists schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `)

  const { rows: applied } = await client.query('select filename from schema_migrations')
  const appliedSet = new Set(applied.map((r) => r.filename))

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  let aplicadas = 0
  for (const file of files) {
    if (appliedSet.has(file)) continue
    const sql = readFileSync(path.join(migrationsDir, file), 'utf8')
    console.log(`Aplicando ${file}...`)
    await client.query('begin')
    try {
      await client.query(sql)
      await client.query('insert into schema_migrations (filename) values ($1)', [file])
      await client.query('commit')
      aplicadas++
    } catch (e) {
      await client.query('rollback')
      throw new Error(`Falló ${file}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  console.log(aplicadas > 0 ? `${aplicadas} migración(es) aplicada(s).` : 'Nada que aplicar — ya está al día.')
} finally {
  await client.end()
}
