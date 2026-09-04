-- Payments & Billing — SBA Sports OS, Fase 2 (MVP1 Business Core)
--
-- Fuentes: Funcionalidades y Casos de Uso Fase 0-2 v1.0 (UC-PAY-01 a UC-PAY-07, texto completo
-- leído), diccionario-datos-fase2.md.
--
-- Decisiones de alcance:
-- - `financial_dimension.is_qualifying_for_block` se agrega aquí, no en la migración original de
--   Configuration Studio — UC-CFG-01..04 no lo necesitaban; UC-PAY-05 es el primer y único
--   consumidor. Se expone/lee vía FinancialDimensionsService (Configuration Studio sigue siendo
--   dueño de la tabla).
-- - `invoice.status` solo almacena 'pending'/'paid' — 'overdue' NUNCA se guarda, se calcula al
--   leer (`due_date < current_date` sobre una fila 'pending'). Esto es exactamente el criterio de
--   aceptación de UC-PAY-02: "el estado de la factura es siempre derivable... no un campo editado
--   manualmente" — si 'overdue' fuera una tercera opción almacenada, alguien tendría que escribirla
--   manualmente o con un cron, violando ese criterio.
-- - `invoice.financial_dimension_id` se copia al generar la factura (desde el product_catalog del
--   membership_plan o del cargo ad hoc) para que UC-PAY-05 no tenga que resolver la cadena
--   invoice→membership_plan→product_catalog→financial_dimension en cada consulta de elegibilidad
--   (que el RFP exige en tiempo real, sin batch).
-- - No se modela integración real con Stripe/Adyen (tokenización, webhooks firmados) — eso es una
--   integración externa deferida, igual que Auth0/Cognito en Identity & Access.

alter table financial_dimension add column is_qualifying_for_block boolean not null default false;

create type billing_cycle as enum ('monthly', 'one_time');
create type membership_plan_status as enum ('active', 'cancelled');

-- UC-PAY-01. Copia nombre/precio del product_catalog al momento de creación (no los vuelve a leer
-- después) — mismo principio de "instantánea al crear" que financial históricos en Admin Hub.
-- `scholarship_*` son datos restringidos (UC-PAY-04, arquitectura §7.4) — el control de acceso vive
-- en la capa de aplicación (ScholarshipService/redactarBecaSiNoTieneScope), no en RLS: RLS aísla
-- por tenant, no por scope dentro del mismo tenant.
create table membership_plan (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references organization(id),
  athlete_user_id     uuid not null references "user"(id),
  product_catalog_id  uuid not null references product_catalog(id),
  name                text not null,
  amount              numeric(12, 2) not null,
  currency            text not null,
  billing_cycle       billing_cycle not null,
  scholarship_flag    boolean not null default false,
  scholarship_amount  numeric(12, 2),
  scholarship_pct     numeric(5, 2),
  status              membership_plan_status not null default 'active',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index idx_membership_plan_org on membership_plan(organization_id);
create index idx_membership_plan_athlete on membership_plan(athlete_user_id);

-- UC-PAY-02. Criterio: "toda invoice referencia un membership_plan o un producto de catálogo
-- válido — nunca un monto libre sin origen trazable" (mismo patrón que el check de email-or-phone
-- en "user", Identity & Access).
create type invoice_status as enum ('pending', 'paid');

create table invoice (
  id                      uuid primary key default gen_random_uuid(),
  organization_id         uuid not null references organization(id),
  athlete_user_id         uuid not null references "user"(id),
  membership_plan_id      uuid references membership_plan(id),
  product_catalog_id      uuid references product_catalog(id),
  financial_dimension_id  uuid references financial_dimension(id),
  amount_due              numeric(12, 2) not null,
  due_date                date not null,
  status                  invoice_status not null default 'pending',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint invoice_origen_trazable check (membership_plan_id is not null or product_catalog_id is not null)
);
create index idx_invoice_org on invoice(organization_id);
create index idx_invoice_athlete on invoice(athlete_user_id);
create index idx_invoice_status_due_date on invoice(status, due_date);

-- UC-PAY-03. `provider_txn_id` es el único dato del proveedor que se almacena — nunca PAN/CVV
-- (PCI-DSS SAQ-A). `reconciliation_status` nunca se sobreescribe en silencio (UC-PAY-03, 5a).
create type transaction_status as enum ('processed', 'failed');
create type reconciliation_status as enum ('ok', 'discrepancy');

create table transaction (
  id                      uuid primary key default gen_random_uuid(),
  organization_id         uuid not null references organization(id),
  invoice_id              uuid not null references invoice(id),
  provider_txn_id         text not null,
  amount                  numeric(12, 2) not null,
  fee_amount              numeric(12, 2),
  status                  transaction_status not null,
  reconciliation_status   reconciliation_status not null default 'ok',
  created_at              timestamptz not null default now(),
  unique (organization_id, provider_txn_id)
);
create index idx_transaction_org on transaction(organization_id);
create index idx_transaction_invoice on transaction(invoice_id);

-- UC-PAY-06. "channel" es [propuesto] — la resolución real del canal es Family & Communications
-- (Fase 6, fuera de alcance); aquí solo se registra que se disparó un recordatorio.
create table notification_log (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references organization(id),
  invoice_id          uuid references invoice(id),
  recipient_user_id   uuid not null references "user"(id),
  channel             text not null default 'email',
  sent_at             timestamptz not null default now()
);
create index idx_notification_log_org on notification_log(organization_id);
create index idx_notification_log_invoice on notification_log(invoice_id);

-- ─── Row-Level Security ────────────────────────────────────────────────────────
alter table membership_plan enable row level security;
alter table membership_plan force row level security;
create policy tenant_isolation on membership_plan
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table invoice enable row level security;
alter table invoice force row level security;
create policy tenant_isolation on invoice
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table transaction enable row level security;
alter table transaction force row level security;
create policy tenant_isolation on transaction
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table notification_log enable row level security;
alter table notification_log force row level security;
create policy tenant_isolation on notification_log
  using (organization_id = current_setting('app.tenant_id', true)::uuid);
