// Espejo de scripts/seed-dev.mjs (raíz del repo) — el picker de login de desarrollo necesita
// mostrar nombre/rol de cada persona sembrada sin depender de un endpoint del backend dedicado a
// listar "personas de desarrollo" (esta lista es infraestructura desechable, no un caso de uso
// real). Si cambias los ids/roles allá, cambia esto también.
export const ORG_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

export interface DevPersona {
  id: string;
  fullName: string;
  role: string;
  email: string;
}

export const DEV_PERSONAS: DevPersona[] = [
  { id: 'bbbbbbbb-0000-0000-0000-000000000001', fullName: 'Admin Demo', role: 'admin', email: 'admin@demo.local' },
  { id: 'bbbbbbbb-0000-0000-0000-000000000002', fullName: 'Directora Demo', role: 'director', email: 'directora@demo.local' },
  { id: 'bbbbbbbb-0000-0000-0000-000000000003', fullName: 'Coach Demo', role: 'coach', email: 'coach@demo.local' },
  { id: 'bbbbbbbb-0000-0000-0000-000000000004', fullName: 'Tutor Demo', role: 'parent', email: 'tutor@demo.local' },
  { id: 'bbbbbbbb-0000-0000-0000-000000000005', fullName: 'Atleta Adulto Demo', role: 'player', email: 'atleta-adulto@demo.local' },
  { id: 'bbbbbbbb-0000-0000-0000-000000000006', fullName: 'Atleta Menor Activo Demo', role: 'player', email: 'atleta-menor-activo@demo.local' },
  { id: 'bbbbbbbb-0000-0000-0000-000000000007', fullName: 'Atleta Menor Pendiente Demo', role: 'player (pending)', email: 'atleta-menor-pendiente@demo.local' },
];
