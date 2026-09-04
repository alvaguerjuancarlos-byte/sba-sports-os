-- Configuration Studio (mínimo viable) — SBA Sports OS, Fase 2 (MVP1 Business Core)
--
-- Fuentes: Funcionalidades y Casos de Uso Fase 0-2 v1.0 (UC-CFG-01 a UC-CFG-04, texto completo
-- leído), diccionario-datos-fase2.md. CLAUDE.md: "aquí solo lo indispensable para que Admin Hub y
-- Payments tengan catálogo sobre el cual operar" — no se construye custom_field_definition ni el
-- resto de Configuration Studio de Fase 6 todavía.

-- ─── FinancialDimension ────────────────────────────────────────────────────────
-- UC-CFG-01. Jerarquía class > group > budget_line > concept (ilustrativo del documento fuente:
-- "Revenue → Marketing Partnerships" = class → group; ejemplo explícito de jerarquía inválida:
-- concept como padre de class). El orden y la regla de validación viven en
-- src/configuration-studio/configuration-studio.types.ts (esJerarquiaValida) — aquí solo se
-- garantiza la unicidad de nombre por tipo+tenant, que sí es un criterio de aceptación literal.
create type dimension_type as enum ('class', 'group', 'budget_line', 'concept');
create type cfg_status as enum ('active', 'archived');

create table financial_dimension (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization(id),
  type            dimension_type not null,
  name            text not null,
  parent_id       uuid references financial_dimension(id),
  status          cfg_status not null default 'active', -- UC-CFG-01: nunca se borra, se archiva
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, type, name) -- "el nombre sea único dentro del mismo tipo y tenant"
);
create index idx_financial_dimension_org on financial_dimension(organization_id);
create index idx_financial_dimension_parent on financial_dimension(parent_id);

-- ─── ProductCatalog ────────────────────────────────────────────────────────────
-- UC-CFG-02. `product_key` identifica "el mismo producto" a través de sus versiones de precio en
-- el tiempo — cada cambio de precio crea una fila nueva, nunca edita `price` de una fila existente
-- (criterio de aceptación: "ninguna factura histórica cambia de monto retroactivamente"). El
-- índice único parcial de abajo es el backstop a nivel de base de datos de esa regla: solo puede
-- existir UNA versión "abierta" (`effective_until is null`) por producto a la vez — la aplicación
-- (crearVersionProductoEnTransaccion) cierra la versión previa antes de insertar la nueva.
-- `[propuesto]`: nombre de tabla y el campo `product_key` no vienen literales del documento fuente
-- (que deja el modelo de esta entidad como "punto a cerrar") — es la interpretación mínima que
-- soporta el versionado por effective_date que sí es un criterio de aceptación explícito.
create table product_catalog (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references organization(id),
  product_key              uuid not null,
  name                     text not null,
  attributes               jsonb,
  price                    numeric(12, 2) not null,
  financial_dimension_id   uuid references financial_dimension(id),
  effective_date           date not null,
  effective_until          date, -- null = versión vigente actual
  status                   cfg_status not null default 'active',
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index idx_product_catalog_org on product_catalog(organization_id);
create index idx_product_catalog_key on product_catalog(product_key);
create unique index idx_product_catalog_una_version_abierta
  on product_catalog(organization_id, product_key)
  where effective_until is null;

-- ─── Row-Level Security ────────────────────────────────────────────────────────
alter table financial_dimension enable row level security;
alter table financial_dimension force row level security;
create policy tenant_isolation on financial_dimension
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table product_catalog enable row level security;
alter table product_catalog force row level security;
create policy tenant_isolation on product_catalog
  using (organization_id = current_setting('app.tenant_id', true)::uuid);
