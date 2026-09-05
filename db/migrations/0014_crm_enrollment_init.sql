-- CRM & Enrollment — SBA Sports OS, Fase 6 (People/Experience & AI)
--
-- Fuentes: Funcionalidades y Casos de Uso Fase 6 v1.1 (UC-CRM-01 a 04, texto completo leído).
--
-- Decisiones de alcance:
-- - "Cada cambio de stage queda con fecha, alimentando fact_enrollment_funnel" (UC-CRM-01) —
--   este dominio NO crea `fact_enrollment_funnel` (esa es una tabla OLAP, arquitectura §6.1,
--   propiedad del dominio Reporting & AI que se construye después en esta misma fase). El rastro
--   de fecha por cambio de stage se satisface reusando `audit_log` (entityType='prospect',
--   field_changed='stage') — transversal, ya trae actor+timestamp+old/new por diseño — en vez de
--   crear una tabla OLTP paralela que solo duplicaría lo que audit_log ya registra. Cuando se
--   construya Reporting & AI, el pipeline que alimenta fact_enrollment_funnel lee de aquí.
-- - **UC-CRM-04 (analítica de conversión) NO se implementa en este dominio** — el propio texto
--   dice explícitamente "alimentado por fact_enrollment_funnel, no por consulta directa a
--   prospect en producción (arquitectura §6.1, separación OLTP/OLAP)". Construir esa consulta
--   contra `prospect`/`audit_log` ahora contradecría la fuente literal; se implementa cuando el
--   dominio Reporting & AI (mismo documento, sección 5) construya el warehouse real.
-- - UC-CRM-03 describe una "transacción atómica" de 3 pasos (user/rol, enrollment, membership_plan)
--   que cruza 3 dominios (Identity & Access, este dominio, Payments & Billing), cada uno con su
--   propio `db.withTenant`. Este stack (pg crudo, sin orquestador de sagas) no tiene transacciones
--   distribuidas reales entre llamadas a distintos servicios — se aproxima con
--   validar-antes-de-comprometer + compensación explícita si un paso posterior falla (revocar el
--   user_tenant_role recién creado). Ver enrollment.service.ts para el detalle exacto.

create type prospect_stage as enum ('lead', 'trial', 'negotiation', 'won', 'lost');

create table prospect (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organization(id),
  name              text not null,
  contact_info      text not null,
  source            text not null,
  tags              jsonb not null default '[]'::jsonb,
  stage             prospect_stage not null default 'lead',
  assigned_to       uuid references "user"(id),
  converted_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_prospect_org on prospect(organization_id);
create index idx_prospect_stage on prospect(organization_id, stage);

-- UC-CRM-02. `attended` nullable — "explícito true/false, nunca inferido de la ausencia de
-- registro": null significa "todavía no se ha marcado", no "no asistió".
create table trial_class_attendance (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization(id),
  prospect_id     uuid not null references prospect(id),
  event_id        uuid not null references event(id),
  attended        boolean,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_trial_class_attendance_org on trial_class_attendance(organization_id);
create index idx_trial_class_attendance_prospect on trial_class_attendance(prospect_id);

-- UC-CRM-03. `prospect_id` nullable porque un enrollment también puede originarse fuera del
-- funnel comercial (arquitectura: "prospect_id FK (nullable)") — este dominio siempre lo llena
-- porque UC-CRM-03 es el único flujo de creación implementado hoy, pero la columna no lo exige.
create table enrollment (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization(id),
  prospect_id     uuid references prospect(id),
  user_id         uuid not null references "user"(id),
  plan_id         uuid not null references membership_plan(id),
  enrolled_at     timestamptz not null default now()
);
create index idx_enrollment_org on enrollment(organization_id);
create index idx_enrollment_user on enrollment(user_id);

-- ─── Row-Level Security ────────────────────────────────────────────────────────
alter table prospect enable row level security;
alter table prospect force row level security;
create policy tenant_isolation on prospect
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table trial_class_attendance enable row level security;
alter table trial_class_attendance force row level security;
create policy tenant_isolation on trial_class_attendance
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table enrollment enable row level security;
alter table enrollment force row level security;
create policy tenant_isolation on enrollment
  using (organization_id = current_setting('app.tenant_id', true)::uuid);
