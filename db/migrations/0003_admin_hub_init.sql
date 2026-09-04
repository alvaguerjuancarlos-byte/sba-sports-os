-- Admin Hub — SBA Sports OS, Fase 2 (MVP1 Business Core)
--
-- Fuentes: Funcionalidades y Casos de Uso Fase 0-2 v1.0 (UC-ADM-01 a UC-ADM-07, texto completo
-- leído), diccionario-datos-fase2.md.
--
-- Decisiones de alcance frente al diccionario propuesto:
-- - `season`/`period` son columnas de texto en `budget_line`, no una entidad `season` propia — el
--   documento fuente no describe los campos de esa tabla por separado (Fase 2 no incluye gestión
--   de temporadas como dominio propio).
-- - `commitment` es una tabla independiente, no el `status` de `purchase_order` (como sugería el
--   diccionario) — UC-ADM-04/05 exigen la transición open→consumed como ciclo de vida propio,
--   independiente de si la purchase_order en sí se considera "abierta" o "cerrada".
-- - `budget_line.status` (active/archived) se agrega porque UC-ADM-02 alt-flow 1a lo exige
--   explícitamente ("el budget_line está archivado... el sistema rechaza la captura"), aunque el
--   diccionario no lo listaba.
-- - Diferidos, no implementados con un valor inventado: UC-ADM-04 alt-flow 1a (margen configurable
--   + nueva ronda de aprobación si la PO difiere del monto solicitado) y UC-ADM-05 alt-flow 1b
--   (gasto directo permitido por dimensión, sin purchase_order) — ambos dependen de un mecanismo
--   de configuración que no existe todavía en Configuration Studio.

create table vendor (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization(id),
  name            text not null,
  tax_id          text,
  status          cfg_status not null default 'active', -- reusa el enum active/archived de Configuration Studio
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_vendor_org on vendor(organization_id);

-- UC-ADM-01. "por temporada" — [propuesto] season/period como texto libre (ver nota arriba).
create table budget_line (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references organization(id),
  financial_dimension_id uuid not null references financial_dimension(id),
  season                 text not null,
  period                 text not null,
  amount_budgeted        numeric(12, 2) not null,
  status                 cfg_status not null default 'active',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (organization_id, financial_dimension_id, season, period)
);
create index idx_budget_line_org on budget_line(organization_id);

-- UC-ADM-02/03. `routing` es la clasificación dentro-de-presupuesto/excepción (inmutable, decidida
-- al capturar la solicitud); `status` es el ciclo de vida de aprobación.
create type purchase_request_routing as enum ('within_budget', 'exception');
create type purchase_request_status as enum ('pending', 'approved', 'rejected');

create table purchase_request (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organization(id),
  requested_by     uuid not null references "user"(id),
  budget_line_id   uuid not null references budget_line(id),
  amount           numeric(12, 2) not null,
  justification    text,
  routing          purchase_request_routing not null,
  status           purchase_request_status not null default 'pending',
  approved_by      uuid references "user"(id),
  rejection_reason text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_purchase_request_org on purchase_request(organization_id);
create index idx_purchase_request_budget_line on purchase_request(budget_line_id);

-- UC-ADM-04. Una purchase_request aprobada da lugar a exactamente una purchase_order (unique).
create table purchase_order (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references organization(id),
  purchase_request_id uuid not null references purchase_request(id),
  vendor_id           uuid not null references vendor(id),
  amount              numeric(12, 2) not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (purchase_request_id)
);
create index idx_purchase_order_org on purchase_order(organization_id);

-- UC-ADM-04/05. "Purchase Order creates commitment; actual posting releases/consumes commitment"
-- (RFP §6, literal) — tabla propia, no un campo de purchase_order.
create type commitment_status as enum ('open', 'consumed');

create table commitment (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organization(id),
  purchase_order_id uuid not null references purchase_order(id),
  budget_line_id    uuid not null references budget_line(id),
  amount            numeric(12, 2) not null,
  status            commitment_status not null default 'open',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_commitment_org on commitment(organization_id);
create index idx_commitment_budget_line on commitment(budget_line_id);
create index idx_commitment_purchase_order on commitment(purchase_order_id);

-- UC-ADM-05. El gasto real reconocido — separado de `commitment` para que UC-ADM-07 nunca sume
-- ambas cifras juntas (criterio de aceptación explícito).
create table actual_posting (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organization(id),
  purchase_order_id uuid not null references purchase_order(id),
  budget_line_id    uuid not null references budget_line(id),
  amount            numeric(12, 2) not null,
  posted_at         timestamptz not null default now(),
  created_at        timestamptz not null default now()
);
create index idx_actual_posting_org on actual_posting(organization_id);
create index idx_actual_posting_budget_line on actual_posting(budget_line_id);

-- ─── Row-Level Security ────────────────────────────────────────────────────────
alter table vendor enable row level security;
alter table vendor force row level security;
create policy tenant_isolation on vendor
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table budget_line enable row level security;
alter table budget_line force row level security;
create policy tenant_isolation on budget_line
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table purchase_request enable row level security;
alter table purchase_request force row level security;
create policy tenant_isolation on purchase_request
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table purchase_order enable row level security;
alter table purchase_order force row level security;
create policy tenant_isolation on purchase_order
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table commitment enable row level security;
alter table commitment force row level security;
create policy tenant_isolation on commitment
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table actual_posting enable row level security;
alter table actual_posting force row level security;
create policy tenant_isolation on actual_posting
  using (organization_id = current_setting('app.tenant_id', true)::uuid);
