-- Performance — SBA Sports OS, Fase 5 (Athlete 360)
--
-- Fuentes: Funcionalidades y Casos de Uso Fase 5 v1.1 (UC-PRF-01 a 04, texto completo leído).
--
-- Decisiones de alcance:
-- - `performance_assessment` no tiene un caso de uso propio que la capture en este documento — el
--   documento la trata como dato ya existente que UC-PRF-01 agrega, con las columnas exactas que
--   ya definía la arquitectura §6.3 desde v0.6 (id, player_id, coach_id, assessment_date,
--   category, score, notes). Se construye aquí un capturador mínimo (PerformanceAssessmentService
--   .registrar) porque sin ÉL, la agregación de UC-PRF-01 no tendría datos reales que agregar —
--   mismo criterio que `venue` en Calendar & RSVP: CRUD estructural sin UC dedicado, necesario
--   para que el caso de uso real (aquí, Development Map) tenga sentido.
-- - `development_map` es upsert por (scope, scope_ref_id, date_range_start, date_range_end) — "el
--   sistema crea/actualiza development_map" (UC-PRF-01/02, literal) — recalcular el mismo rango
--   para el mismo scope actualiza el resultado en vez de acumular filas históricas redundantes.
-- - `dimensions` (jsonb) es un objeto {nombre_dimensión: {value, sufficientData, excludedCount?}}
--   — "dimensiones de desarrollo configuradas" (UC-PRF-01, literal) sugiere que el conjunto de
--   dimensiones es configurable, pero ningún caso de uso de este documento define esa pantalla de
--   configuración; se fija un conjunto de 4 dimensiones derivadas 1:1 de las 4 fuentes que el
--   propio UC-PRF-01 lista (performance_assessment, player_statistic, weekly_feedback,
--   attendance) — [propuesto], documentado en development.types.ts junto al cálculo.
-- - `ai_suggestion` (jsonb, nullable) — [propuesto]: se implementa como una función determinista
--   basada en reglas explicables (promedios + comparación contra un umbral mínimo de volumen),
--   no una integración real de ML/LLM — mismo tratamiento que ya recibió la priorización de
--   alternos en Call-up Engine (UC-CUP-03). El motor real de "analítica pasiva" que describe la
--   arquitectura (§5.1/§5.2) es infraestructura de modelo futura, fuera de alcance de este repo.

create table performance_assessment (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organization(id),
  player_id         uuid not null references "user"(id),
  coach_id          uuid not null references "user"(id),
  assessment_date   date not null,
  category          text not null,
  score             numeric not null,
  notes             text,
  created_at        timestamptz not null default now(),
  constraint performance_assessment_score_valido check (score >= 0 and score <= 100)
);
create index idx_performance_assessment_org on performance_assessment(organization_id);
create index idx_performance_assessment_player on performance_assessment(player_id);

create type development_map_scope as enum ('athlete', 'team', 'academy');

create table development_map (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references organization(id),
  scope               development_map_scope not null,
  scope_ref_id        uuid not null,
  date_range_start    date not null,
  date_range_end      date not null,
  dimensions          jsonb not null,
  ai_suggestion       jsonb,
  generated_at        timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint development_map_rango_valido check (date_range_start <= date_range_end),
  unique (organization_id, scope, scope_ref_id, date_range_start, date_range_end)
);
create index idx_development_map_org on development_map(organization_id);
create index idx_development_map_scope_ref on development_map(scope, scope_ref_id);

-- ─── Row-Level Security ────────────────────────────────────────────────────────
alter table performance_assessment enable row level security;
alter table performance_assessment force row level security;
create policy tenant_isolation on performance_assessment
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table development_map enable row level security;
alter table development_map force row level security;
create policy tenant_isolation on development_map
  using (organization_id = current_setting('app.tenant_id', true)::uuid);
