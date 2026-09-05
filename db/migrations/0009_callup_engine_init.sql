-- Call-up Engine — SBA Sports OS, Fase 4 (Competition)
--
-- Fuentes: Funcionalidades y Casos de Uso Fase 4 v1.0 (UC-CUP-01 a UC-CUP-06, texto completo
-- leído). El documento con más reglas de negocio literales del RFP citadas directamente.
--
-- Decisiones de alcance:
-- - `callup_format_rule` vive en ESTE dominio, no en Configuration Studio, aunque UC-CUP-06 diga
--   "Admin configura... desde Configuration Studio" — se lee como una descripción de UX (pantalla
--   agrupada bajo "Configuración" en el producto), no como instrucción de que la tabla deba vivir
--   en el módulo NestJS de Configuration Studio. Mismo criterio que budget_line en Admin Hub, que
--   también es "configuración" de negocio pero vive en su propio dominio.
-- - `priority_window_days` en `callup_format_rule` es la "ventana configurable, no fija en código"
--   que UC-CUP-03 exige para el cálculo de prioridad de alternos — [propuesto] el documento no da
--   un valor por defecto ni dice dónde vive la configuración; se agrega aquí porque
--   callup_format_rule ya es la entidad de configuración por deporte/formato más cercana.
-- - `callup_slot.status` incluye 'excluded' (no está en el texto de UC-CUP-01, que solo lista
--   called/alternate) porque UC-CUP-04 (waiver) necesita un estado para "excluir sin borrar" — el
--   principio de no-borrado de todo el sistema aplica igual aquí.

create type callup_slot_status as enum ('called', 'alternate', 'accepted', 'declined', 'excluded');
create type callup_format_rule_status as enum ('active', 'archived');

-- UC-CUP-06. Solo una regla ACTIVA por deporte+formato a la vez (índice único parcial, mismo
-- patrón que idx_product_catalog_una_version_abierta en Configuration Studio) — para cambiar
-- max_players se archiva la vieja y se crea una nueva, nunca se edita in-place.
create table callup_format_rule (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references organization(id),
  sport                  text not null,
  format                 text not null,
  max_players            integer not null,
  priority_window_days   integer not null default 28,
  status                 callup_format_rule_status not null default 'active',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint callup_format_rule_valores_validos check (max_players > 0 and priority_window_days > 0)
);
create index idx_callup_format_rule_org on callup_format_rule(organization_id);
create unique index idx_callup_format_rule_activa on callup_format_rule(organization_id, sport, format) where status = 'active';

-- UC-CUP-01. Una convocatoria por evento.
create table callup_list (
  id                      uuid primary key default gen_random_uuid(),
  organization_id         uuid not null references organization(id),
  event_id                uuid not null references event(id),
  callup_format_rule_id   uuid not null references callup_format_rule(id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (event_id)
);
create index idx_callup_list_org on callup_list(organization_id);

-- UC-CUP-01/02/03/04. `priority_score` solo aplica a slots 'alternate' (UC-CUP-03); nulo para
-- 'called'. Un slot por jugador por convocatoria — nunca duplicado.
create table callup_slot (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organization(id),
  callup_list_id   uuid not null references callup_list(id),
  user_id          uuid not null references "user"(id),
  status           callup_slot_status not null,
  priority_score   numeric,
  responded_at     timestamptz,
  responded_by     uuid references "user"(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (callup_list_id, user_id)
);
create index idx_callup_slot_org on callup_slot(organization_id);
create index idx_callup_slot_list on callup_slot(callup_list_id);
create index idx_callup_slot_list_status on callup_slot(callup_list_id, status);

-- UC-CUP-04. `internal_comment` es dato restringido — "nunca es visible fuera de roles admin,
-- incluida cualquier exportación o vista de familia/jugador" (arquitectura §7.4, mismo mecanismo
-- que becas en Payments & Billing, UC-PAY-04) — el control de acceso vive en la capa de
-- aplicación (redactarComentarioSiNoTieneScope), no en RLS.
create type callup_waiver_action as enum ('exclude', 'include');

create table callup_waiver (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organization(id),
  callup_slot_id    uuid not null references callup_slot(id),
  waived_by         uuid not null references "user"(id),
  action            callup_waiver_action not null,
  internal_comment  text not null,
  created_at        timestamptz not null default now(),
  constraint callup_waiver_comentario_obligatorio check (length(trim(internal_comment)) > 0)
);
create index idx_callup_waiver_org on callup_waiver(organization_id);
create index idx_callup_waiver_slot on callup_waiver(callup_slot_id);

-- ─── Row-Level Security ────────────────────────────────────────────────────────
alter table callup_format_rule enable row level security;
alter table callup_format_rule force row level security;
create policy tenant_isolation on callup_format_rule
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table callup_list enable row level security;
alter table callup_list force row level security;
create policy tenant_isolation on callup_list
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table callup_slot enable row level security;
alter table callup_slot force row level security;
create policy tenant_isolation on callup_slot
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table callup_waiver enable row level security;
alter table callup_waiver force row level security;
create policy tenant_isolation on callup_waiver
  using (organization_id = current_setting('app.tenant_id', true)::uuid);
