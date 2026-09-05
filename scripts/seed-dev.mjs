// Seed de desarrollo — a diferencia de los scripts de verificación end-to-end de este proyecto
// (que crean datos y los borran al terminar), este script crea una organización y un puñado de
// personas PERSISTENTES para navegar el frontend con datos reales. Idempotente (on conflict do
// nothing) — correrlo varias veces no duplica nada.
//
// Usado por el login de desarrollo (src/auth/dev-login/) para tener contra qué autenticar.
import pg from 'pg'

const { Client } = pg

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL no está definida — ver .env.example.')
  process.exit(1)
}

export const ORG_ID = 'aaaaaaaa-0000-0000-0000-000000000001'

export const PERSONAS = {
  admin: { id: 'bbbbbbbb-0000-0000-0000-000000000001', fullName: 'Admin Demo', email: 'admin@demo.local', role: 'admin', dateOfBirth: '1985-01-01' },
  director: { id: 'bbbbbbbb-0000-0000-0000-000000000002', fullName: 'Directora Demo', email: 'directora@demo.local', role: 'director', dateOfBirth: '1980-01-01' },
  coach: { id: 'bbbbbbbb-0000-0000-0000-000000000003', fullName: 'Coach Demo', email: 'coach@demo.local', role: 'coach', dateOfBirth: '1990-01-01' },
  tutor: { id: 'bbbbbbbb-0000-0000-0000-000000000004', fullName: 'Tutor Demo', email: 'tutor@demo.local', role: 'parent', dateOfBirth: '1978-01-01' },
  atletaAdulto: { id: 'bbbbbbbb-0000-0000-0000-000000000005', fullName: 'Atleta Adulto Demo', email: 'atleta-adulto@demo.local', role: 'player', dateOfBirth: '2000-01-01' },
  // Menor ya con consentimiento otorgado — aparece 'active' en el listado, útil para navegar el
  // resto de la app sin tener que resolver un consentimiento primero.
  atletaMenorActivo: { id: 'bbbbbbbb-0000-0000-0000-000000000006', fullName: 'Atleta Menor Activo Demo', email: 'atleta-menor-activo@demo.local', role: 'player', dateOfBirth: '2012-01-01' },
  // Menor con consentimiento pendiente — demuestra la bandeja de UC-ID-03 desde el primer arranque.
  atletaMenorPendiente: { id: 'bbbbbbbb-0000-0000-0000-000000000007', fullName: 'Atleta Menor Pendiente Demo', email: 'atleta-menor-pendiente@demo.local', role: 'player', dateOfBirth: '2013-01-01' },
}

async function insertarGuardianLinkSiNoExiste(client, organizationId, guardianUserId, athleteUserId, consentStatus) {
  const { rows } = await client.query(
    `select 1 from guardian_link where organization_id = $1 and guardian_user_id = $2 and athlete_user_id = $3`,
    [organizationId, guardianUserId, athleteUserId],
  )
  if (rows.length > 0) return
  if (consentStatus === 'granted') {
    await client.query(
      `insert into guardian_link (organization_id, guardian_user_id, athlete_user_id, consent_status, consent_captured_at, privacy_notice_version)
       values ($1, $2, $3, 'granted', now(), 'v1')`,
      [organizationId, guardianUserId, athleteUserId],
    )
  } else {
    await client.query(
      `insert into guardian_link (organization_id, guardian_user_id, athlete_user_id, consent_status) values ($1, $2, $3, 'requested')`,
      [organizationId, guardianUserId, athleteUserId],
    )
  }
}

async function main() {
  const client = new Client({ connectionString })
  await client.connect()

  try {
    await client.query('begin')
    // Todas las tablas con organization_id llevan FORCE ROW LEVEL SECURITY (ver DatabaseService
    // .withTenant) — sin este SET LOCAL, cualquier INSERT contra ellas es rechazado por RLS.
    await client.query('select set_config($1, $2, true)', ['app.tenant_id', ORG_ID])

    await client.query(
      `insert into organization (id, name, country_code) values ($1, 'Academia Demo', 'MX') on conflict (id) do nothing`,
      [ORG_ID],
    )

    for (const persona of Object.values(PERSONAS)) {
      await client.query(
        `insert into "user" (id, full_name, email, date_of_birth) values ($1, $2, $3, $4) on conflict (id) do nothing`,
        [persona.id, persona.fullName, persona.email, persona.dateOfBirth],
      )
    }

    const activos = ['admin', 'director', 'coach', 'tutor', 'atletaAdulto', 'atletaMenorActivo']
    for (const clave of activos) {
      const persona = PERSONAS[clave]
      await client.query(
        `insert into user_tenant_role (organization_id, user_id, role, status) values ($1, $2, $3, 'active') on conflict (organization_id, user_id, role) do nothing`,
        [ORG_ID, persona.id, persona.role],
      )
    }
    // UC-ID-03: un player menor sin consentimiento otorgado queda 'pending', nunca 'active'.
    await client.query(
      `insert into user_tenant_role (organization_id, user_id, role, status) values ($1, $2, 'player', 'pending') on conflict (organization_id, user_id, role) do nothing`,
      [ORG_ID, PERSONAS.atletaMenorPendiente.id],
    )

    // guardian_link no tiene un constraint único (ver migración 0001) — se verifica existencia a
    // mano para que el script siga siendo idempotente.
    await insertarGuardianLinkSiNoExiste(client, ORG_ID, PERSONAS.tutor.id, PERSONAS.atletaMenorActivo.id, 'granted')
    await insertarGuardianLinkSiNoExiste(client, ORG_ID, PERSONAS.tutor.id, PERSONAS.atletaMenorPendiente.id, 'requested')

    await client.query('commit')
    console.log(`Seed de desarrollo aplicado — organización ${ORG_ID} ("Academia Demo").`)
    console.log('Personas disponibles para el login de desarrollo:')
    for (const [clave, persona] of Object.entries(PERSONAS)) {
      console.log(`  ${clave.padEnd(20)} ${persona.id}  (${persona.role}, ${persona.email})`)
    }
  } catch (e) {
    await client.query('rollback')
    throw e
  } finally {
    await client.end()
  }
}

await main()
