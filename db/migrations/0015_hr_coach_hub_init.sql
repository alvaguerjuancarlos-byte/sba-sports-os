-- HR / Coach Hub — SBA Sports OS, Fase 6 (People/Experience & AI)
--
-- Fuentes: Funcionalidades y Casos de Uso Fase 6 v1.1 (UC-HR-01 a 05, texto completo leído).
--
-- Decisiones de alcance:
-- - `employee.user_id` es nullable — "no todo expediente de HR requiere una cuenta de acceso a
--   la plataforma" (UC-HR-01, 1a, literal).
-- - `employee_attendance` (nueva, [propuesto]) — UC-HR-02 (condensado) dice "registra su
--   asistencia" pero su lista de Entidades solo nombra `employee` y `fact_hr_attendance` (tabla
--   OLAP, no construida todavía — ver Reporting & AI, sección 5 del mismo documento). Sin una
--   tabla OLTP intermedia, "registrar asistencia" no tendría dónde persistir el evento antes de
--   que exista el pipeline OLAP — se agrega esta tabla mínima, análoga a `checkin_event` (Fase 3)
--   pero para personal, exactamente como el propio UC-HR-02 la describe ("mismo patrón de
--   captura... aplicado a personal en vez de atletas").
-- - Ningún dato de nómina calcula montos a pagar — `payroll_input` solo captura insumos
--   (criterio de aceptación UC-HR-03, literal: "el sistema nunca calcula un monto de nómina").
-- - Ninguna baja (`employee.status = 'inactive'`) borra `payroll_input`/`coach_objective` —
--   ambas tablas no tienen ON DELETE CASCADE ni se tocan en el flujo de baja (UC-HR-01, 3a).
-- - `coach_objective.status` nunca cambia por vencimiento de fecha, solo por acción explícita
--   (UC-HR-04, 3a) — no hay ningún trigger/cron que lo module; se documenta aquí porque es la
--   clase de comportamiento que sería fácil de "arreglar" con un job automático más adelante sin
--   leer este criterio primero.

create type employee_status as enum ('active', 'inactive');

create table employee (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organization(id),
  user_id           uuid references "user"(id),
  contract_type     text not null,
  hire_date         date not null,
  status            employee_status not null default 'active',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_employee_org on employee(organization_id);
create index idx_employee_user on employee(user_id);

create table payroll_input (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references organization(id),
  employee_id         uuid not null references employee(id),
  period              text not null,
  hours               numeric,
  bonuses             numeric not null default 0,
  deductions_notes     text,
  created_at          timestamptz not null default now()
);
create index idx_payroll_input_org on payroll_input(organization_id);
create index idx_payroll_input_employee on payroll_input(employee_id);

create type coach_objective_status as enum ('open', 'in_progress', 'achieved', 'not_achieved');

create table coach_objective (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organization(id),
  employee_id       uuid not null references employee(id),
  period            text not null,
  objective_text    text not null,
  status            coach_objective_status not null default 'open',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_coach_objective_org on coach_objective(organization_id);
create index idx_coach_objective_employee on coach_objective(employee_id);

-- UC-HR-02, condensado — ver nota de alcance arriba.
create table employee_attendance (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organization(id),
  employee_id       uuid not null references employee(id),
  checked_in_at     timestamptz not null default now(),
  created_at        timestamptz not null default now()
);
create index idx_employee_attendance_org on employee_attendance(organization_id);
create index idx_employee_attendance_employee on employee_attendance(employee_id);

-- ─── Row-Level Security ────────────────────────────────────────────────────────
alter table employee enable row level security;
alter table employee force row level security;
create policy tenant_isolation on employee
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table payroll_input enable row level security;
alter table payroll_input force row level security;
create policy tenant_isolation on payroll_input
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table coach_objective enable row level security;
alter table coach_objective force row level security;
create policy tenant_isolation on coach_objective
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table employee_attendance enable row level security;
alter table employee_attendance force row level security;
create policy tenant_isolation on employee_attendance
  using (organization_id = current_setting('app.tenant_id', true)::uuid);
