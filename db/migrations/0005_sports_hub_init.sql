-- Sports Hub — SBA Sports OS, Fase 3 (Sports Core)
--
-- Fuentes: Funcionalidades y Casos de Uso Fase 3 v1.0 (UC-SPT-01 a UC-SPT-05, texto completo
-- leído). No hay diccionario-datos-fase3.md — el modelo de esta migración es una interpretación
-- directa del texto de los casos de uso, documentada inline donde se aparta de lo literal.
--
-- Decisión de alcance importante: `budget_line.season` (Admin Hub, Fase 2) sigue siendo texto
-- libre — NO se retrofitea a una FK contra esta nueva tabla `season`. Hacerlo tocaría un dominio
-- ya construido, probado y verificado contra Postgres real fuera del pedido explícito de "sigue
-- con Fase 3". Queda documentado como una duplicación de concepto conocida y deliberada, no un
-- descuido — si se decide reconciliar, es un ejercicio de migración de datos posterior.

-- ─── Season ────────────────────────────────────────────────────────────────────
-- UC-SPT-01. [propuesto]: sin campo `sport` — el texto de este UC condensado solo lista "nombre,
-- fecha de inicio, fecha de fin" como campos capturados; el matiz "no se solapan dos temporadas
-- del mismo deporte" se trata como aviso no bloqueante sobre CUALQUIER solapamiento de fechas
-- entre temporadas activas de la organización (ver esSolapamientoDeFechas en sports-hub.types.ts),
-- no como una regla filtrada por deporte que requeriría un campo que el UC no pide capturar.
create type season_status as enum ('active', 'closed');

create table season (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization(id),
  name            text not null,
  start_date      date not null,
  end_date        date not null,
  status          season_status not null default 'active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint season_fechas_validas check (end_date >= start_date)
);
create index idx_season_org on season(organization_id);

-- ─── Team ──────────────────────────────────────────────────────────────────────
-- UC-SPT-02. "El deporte queda fijo a nivel de equipo, no de jugador" — sport vive aquí, nunca en
-- user/roster_membership. `status` [propuesto] sigue el principio de no-borrado ya establecido en
-- el resto del sistema (financial_dimension, vendor, membership_plan, etc.), aunque el UC
-- condensado no lo pide explícitamente.
create type team_status as enum ('active', 'archived');

create table team (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization(id),
  season_id       uuid not null references season(id),
  name            text not null,
  category        text not null,
  sport           text not null,
  status          team_status not null default 'active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_team_org on team(organization_id);
create index idx_team_season on team(season_id);

-- ─── RosterMembership ────────────────────────────────────────────────────────────
-- UC-SPT-03. "No se elimina, se conserva el histórico" — status en vez de DELETE. `role` reusa el
-- mismo concepto de rol operativo que tenant_role (Identity & Access) para las dos únicas
-- membresías de roster que el UC describe (player, coach) — no el enum completo de tenant_role
-- (admin/parent/director no se rostrean).
create type roster_role as enum ('player', 'coach');
create type roster_membership_status as enum ('active', 'inactive');

create table roster_membership (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization(id),
  team_id         uuid not null references team(id),
  user_id         uuid not null references "user"(id),
  role            roster_role not null,
  jersey_number   integer,
  position        text,
  status          roster_membership_status not null default 'active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_roster_membership_org on roster_membership(organization_id);
create index idx_roster_membership_team on roster_membership(team_id);
create index idx_roster_membership_user on roster_membership(user_id);
-- Un jugador puede tener como máximo UNA membresía ACTIVA por equipo — un índice único total
-- (team_id, user_id, status) bloquearía una segunda baja histórica del mismo equipo (dos filas
-- 'inactive' del mismo par), así que el único parcial aplica solo sobre 'active' (mismo patrón que
-- idx_product_catalog_una_version_abierta, Configuration Studio).
create unique index idx_roster_membership_una_activa on roster_membership(team_id, user_id) where status = 'active';

-- ─── LeagueCup + LeagueStanding ──────────────────────────────────────────────────
-- UC-SPT-04. `format`/`rules` son texto/jsonb libres, no un enum fijo de código — criterio de
-- aceptación explícito: "se captura como configuración... no como valor fijo de código."
create table league_cup (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization(id),
  season_id       uuid not null references season(id),
  name            text not null,
  format          text not null,
  rules           jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_league_cup_org on league_cup(organization_id);
create index idx_league_cup_season on league_cup(season_id);

create table league_standing (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization(id),
  league_cup_id   uuid not null references league_cup(id),
  team_id         uuid not null references team(id),
  points          integer not null default 0,
  wins            integer not null default 0,
  draws           integer not null default 0,
  losses          integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- "La tabla de posiciones existe desde la creación de la competencia" — una fila por equipo
  -- participante, nunca duplicada.
  unique (league_cup_id, team_id)
);
create index idx_league_standing_org on league_standing(organization_id);
create index idx_league_standing_cup on league_standing(league_cup_id);

-- ─── Row-Level Security ────────────────────────────────────────────────────────
alter table season enable row level security;
alter table season force row level security;
create policy tenant_isolation on season
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table team enable row level security;
alter table team force row level security;
create policy tenant_isolation on team
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table roster_membership enable row level security;
alter table roster_membership force row level security;
create policy tenant_isolation on roster_membership
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table league_cup enable row level security;
alter table league_cup force row level security;
create policy tenant_isolation on league_cup
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table league_standing enable row level security;
alter table league_standing force row level security;
create policy tenant_isolation on league_standing
  using (organization_id = current_setting('app.tenant_id', true)::uuid);
