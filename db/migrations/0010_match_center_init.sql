-- Match Center — SBA Sports OS, Fase 4 (Competition)
--
-- Fuentes: Funcionalidades y Casos de Uso Fase 4 v1.0 (UC-MAT-01 a UC-MAT-05, texto completo
-- leído).
--
-- Decisiones de alcance:
-- - "Definir la banca de suplentes" (UC-MAT-01, paso 3) NO crea filas de match_lineup por
--   anticipado — un suplente disponible es, por definición, cualquier callup_slot 'accepted' de
--   la convocatoria que TODAVÍA no tiene fila en match_lineup para este evento (consultable, no
--   persistido aparte). El match_lineup del suplente se crea hasta que efectivamente entra
--   (UC-MAT-02, "el sistema... agrega al entrante" — literal: agrega, no reactiva).
-- - `match_event` no distingue "gol propio" ni captura goles del EQUIPO RIVAL — el documento
--   fuente describe la captura siempre atada a "el jugador involucrado", y los rivales no son
--   entidades de este sistema (Sports Hub no modela clubes externos). El marcador del rival se
--   actualiza por un método aparte, ver match-event.service.ts — [propuesto], el documento no
--   detalla este caso.
-- - `finalMinute` para cerrar el partido (UC-MAT-03) es un input explícito del actor, no derivado
--   — sin él, un partido con cero match_event (0-0 sin goles/tarjetas/cambios) no tendría forma de
--   calcular minutos jugados para nadie, contradiciendo el criterio de aceptación "consolida
--   player_statistic aunque el resultado sea cero eventos."

-- ─── MatchScore ────────────────────────────────────────────────────────────────
create type match_score_status as enum ('live', 'final');

create table match_score (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organization(id),
  event_id          uuid not null references event(id),
  team_score        integer not null default 0,
  opponent_score    integer not null default 0,
  status            match_score_status not null default 'live',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint match_score_valores_validos check (team_score >= 0 and opponent_score >= 0),
  unique (event_id)
);
create index idx_match_score_org on match_score(organization_id);

-- ─── MatchLineup ───────────────────────────────────────────────────────────────
-- Integridad referencial UC-CUP↔UC-MAT: "ningún match_lineup existe sin callup_slot confirmado
-- que lo respalde" — se valida en la aplicación (Call-up Engine es dueño de callup_slot), no se
-- puede expresar como FK cruzada con condición de status.
create table match_lineup (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organization(id),
  event_id         uuid not null references event(id),
  callup_slot_id   uuid not null references callup_slot(id),
  user_id          uuid not null references "user"(id),
  position         text not null,
  formation_slot   text not null,
  is_starter       boolean not null,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (event_id, callup_slot_id)
);
create index idx_match_lineup_org on match_lineup(organization_id);
create index idx_match_lineup_event on match_lineup(event_id);

-- ─── MatchEvent ────────────────────────────────────────────────────────────────
-- `substitute_lineup_id` solo aplica a type='substitution'; `card_color` solo a type='card' — se
-- valida en la aplicación, no con CHECK condicional sobre columnas nulas cruzadas.
create type match_event_type as enum ('goal', 'substitution', 'card');
create type match_card_color as enum ('yellow', 'red');

create table match_event (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references organization(id),
  event_id               uuid not null references event(id),
  type                   match_event_type not null,
  minute                 integer not null,
  player_lineup_id       uuid not null references match_lineup(id),
  substitute_lineup_id   uuid references match_lineup(id),
  card_color             match_card_color,
  pushed_at              timestamptz not null,
  created_at             timestamptz not null default now(),
  constraint match_event_minuto_valido check (minute >= 0)
);
create index idx_match_event_org on match_event(organization_id);
create index idx_match_event_event on match_event(event_id);

-- ─── PlayerStatistic ─────────────────────────────────────────────────────────────
-- UC-MAT-03. Una fila por jugador por partido — "consolida... aunque el resultado sea cero
-- eventos" (siempre se intenta, incluso con todo en cero).
create table player_statistic (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organization(id),
  event_id          uuid not null references event(id),
  user_id           uuid not null references "user"(id),
  minutes_played    integer not null default 0,
  goals             integer not null default 0,
  cards             integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (event_id, user_id)
);
create index idx_player_statistic_org on player_statistic(organization_id);
create index idx_player_statistic_user on player_statistic(user_id);

-- ─── Row-Level Security ────────────────────────────────────────────────────────
alter table match_score enable row level security;
alter table match_score force row level security;
create policy tenant_isolation on match_score
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table match_lineup enable row level security;
alter table match_lineup force row level security;
create policy tenant_isolation on match_lineup
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table match_event enable row level security;
alter table match_event force row level security;
create policy tenant_isolation on match_event
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table player_statistic enable row level security;
alter table player_statistic force row level security;
create policy tenant_isolation on player_statistic
  using (organization_id = current_setting('app.tenant_id', true)::uuid);
