-- Calendar & RSVP — SBA Sports OS, Fase 3 (Sports Core)
--
-- Fuentes: Funcionalidades y Casos de Uso Fase 3 v1.0 (UC-CAL-01 a UC-CAL-04, texto completo
-- leído). Sin diccionario-datos-fase3.md — modelo interpretado directo del texto, documentado
-- inline donde se aparta de lo literal.
--
-- Decisión de alcance: `venue` no tiene un caso de uso propio en este documento (aparece solo como
-- precondición de UC-CAL-01: "el venue está dado de alta") — se modela aquí con el mínimo
-- indispensable (nombre, status) porque sin él UC-CAL-01 no se puede ni probar.
--
-- Nota técnica importante: la detección de conflicto de horario (UC-CAL-02) se implementa
-- comparando `start_at`/`end_at` DENTRO de SQL (WHERE start_at < $x and end_at > $y), nunca
-- comparando esos valores ya leídos en JavaScript — `pg` parsea timestamptz a objetos Date por
-- defecto (mismo comportamiento que ya causó un bug real con columnas `date`, ver
-- src/db/database.service.ts) y ese parser NO se desactivó para timestamptz porque el resto del
-- código nunca compara esos valores como texto. Comparar en SQL evita el problema de raíz.

create type venue_status as enum ('active', 'archived');

create table venue (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization(id),
  name            text not null,
  status          venue_status not null default 'active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_venue_org on venue(organization_id);

-- UC-CAL-01. `team_id` nullable — "el evento es multi-equipo (ej. torneo con varias categorías en
-- la misma sede el mismo día) → event.team_id es nullable precisamente para este caso."
create type event_type as enum ('match', 'training', 'tournament');
create type event_status as enum ('scheduled');

create table event (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization(id),
  type            event_type not null,
  team_id         uuid references team(id),
  league_cup_id   uuid references league_cup(id),
  venue_id        uuid not null references venue(id),
  start_at        timestamptz not null,
  end_at          timestamptz not null,
  status          event_status not null default 'scheduled',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint event_horario_valido check (end_at > start_at)
);
create index idx_event_org on event(organization_id);
create index idx_event_team on event(team_id);
-- La consulta de conflicto (UC-CAL-02) siempre filtra por venue_id + rango de tiempo.
create index idx_event_venue_horario on event(venue_id, start_at, end_at);

-- UC-CAL-03. Una fila por persona esperada a responder (roster member) por evento.
-- "El estado pending nunca se reinterpreta automáticamente como declined" — sin default distinto
-- de 'pending', sin proceso que lo transicione salvo una respuesta real.
create type rsvp_status as enum ('pending', 'confirmed', 'declined');

create table attendance (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization(id),
  event_id        uuid not null references event(id),
  user_id         uuid not null references "user"(id),
  status          rsvp_status not null default 'pending',
  responded_by    uuid references "user"(id),
  responded_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (event_id, user_id)
);
create index idx_attendance_org on attendance(organization_id);
create index idx_attendance_event on attendance(event_id);
create index idx_attendance_user on attendance(user_id);

-- ─── Row-Level Security ────────────────────────────────────────────────────────
alter table venue enable row level security;
alter table venue force row level security;
create policy tenant_isolation on venue
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table event enable row level security;
alter table event force row level security;
create policy tenant_isolation on event
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table attendance enable row level security;
alter table attendance force row level security;
create policy tenant_isolation on attendance
  using (organization_id = current_setting('app.tenant_id', true)::uuid);
