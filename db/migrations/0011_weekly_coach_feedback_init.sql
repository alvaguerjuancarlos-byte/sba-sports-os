-- Weekly Coach Feedback — SBA Sports OS, Fase 5 (Athlete 360)
--
-- Fuentes: Funcionalidades y Casos de Uso Fase 5 v1.1 (UC-WCF-01/02, texto completo leído).
--
-- Decisiones de alcance:
-- - `weekly_feedback_question_config` vive en ESTE dominio, no en Configuration Studio, aunque
--   UC-WCF-01 diga "configurables desde Configuration Studio" — mismo criterio ya aplicado a
--   callup_format_rule (Fase 4, ver 0009): se lee como descripción de UX, no como instrucción de
--   en qué módulo NestJS vive la tabla. Archivar-no-editar, mismo patrón que callup_format_rule.
-- - `dna` se agrega como columna nullable desde el día 1, cerrando la brecha [ABIERTO] #4 del
--   documento fuente (sección 5) — es el ajuste de menor esfuerzo que el propio documento
--   recomienda ("agregar una columna, no una entidad nueva") y sin él UC-WCF-01 no se puede
--   implementar literal (el flujo principal lo lista explícitamente junto a mood/attention/etc).
--   Qué significa "DNA" no lo define el RFP — se persiste como texto libre, sin validar contenido.
-- - mood/attention/attitude/disposition/commitment se modelan como smallint 1-5 (escala Likert)
--   — [propuesto], el RFP no especifica la escala, pero una captura de "menos de un minuto por
--   atleta" solo es realista con un control de selección rápida (tap), no un campo de texto libre.
-- - Todas las columnas de captura son nullable, y el guardado es por jugador (no una sola fila
--   por lote) — el criterio de aceptación "ningún campo obligatorio de un jugador bloquea el
--   guardado del resto del lote" se cumple porque cada jugador es una fila independiente; la
--   aplicación nunca envuelve el lote completo en una sola transacción que pueda revertir todo.
-- - Un `weekly_feedback` por jugador por semana: capturar de nuevo la misma semana actualiza la
--   fila existente (upsert) — es la forma natural de "guardado parcial, se completa después" sin
--   acumular filas duplicadas para la misma semana.

create type weekly_feedback_question_config_status as enum ('active', 'archived');

-- UC-WCF-01, paso 2: "responde 3 preguntas específicas del deporte, configurables". Solo una
-- config ACTIVA por deporte a la vez, mismo patrón de índice único parcial que
-- idx_callup_format_rule_activa.
create table weekly_feedback_question_config (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references organization(id),
  sport              text not null,
  question_1_label   text not null,
  question_2_label   text not null,
  question_3_label   text not null,
  status             weekly_feedback_question_config_status not null default 'active',
  created_at         timestamptz not null default now()
);
create index idx_wfq_config_org on weekly_feedback_question_config(organization_id);
create unique index idx_wfq_config_activa on weekly_feedback_question_config(organization_id, sport) where status = 'active';

create table weekly_feedback (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organization(id),
  team_id           uuid not null references team(id),
  player_id         uuid not null references "user"(id),
  coach_id          uuid not null references "user"(id),
  week_ending       date not null,
  mood              smallint,
  attention         smallint,
  attitude          smallint,
  disposition       smallint,
  commitment        smallint,
  dna               text,
  sport_question_1  text,
  sport_question_2  text,
  sport_question_3  text,
  note              text,
  voice_url         text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint weekly_feedback_escalas_validas check (
    (mood is null or mood between 1 and 5) and
    (attention is null or attention between 1 and 5) and
    (attitude is null or attitude between 1 and 5) and
    (disposition is null or disposition between 1 and 5) and
    (commitment is null or commitment between 1 and 5)
  ),
  unique (player_id, week_ending)
);
create index idx_weekly_feedback_org on weekly_feedback(organization_id);
create index idx_weekly_feedback_player on weekly_feedback(player_id);
create index idx_weekly_feedback_team on weekly_feedback(team_id);

-- ─── Row-Level Security ────────────────────────────────────────────────────────
alter table weekly_feedback_question_config enable row level security;
alter table weekly_feedback_question_config force row level security;
create policy tenant_isolation on weekly_feedback_question_config
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table weekly_feedback enable row level security;
alter table weekly_feedback force row level security;
create policy tenant_isolation on weekly_feedback
  using (organization_id = current_setting('app.tenant_id', true)::uuid);
