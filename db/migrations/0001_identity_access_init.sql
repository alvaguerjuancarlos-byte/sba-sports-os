-- Identity & Access — SBA Sports OS, Fase 2 (MVP1 Business Core)
--
-- Fuentes (autoridad, ver CLAUDE.md): Documento Maestro de Arquitectura v1.1 §3.4/§6.3/§7.1-7.2,
-- Funcionalidades y Casos de Uso Fase 0-2 v1.0 (UC-ID-01 a UC-ID-05, texto completo leído),
-- diccionario-datos-fase2.md.
--
-- `organization` es la única tabla de este archivo sin detalle explícito en los documentos de
-- Fase 2 (se hereda "sin cambios" de v0.6, cuyo detalle de campos no está en este repo) — los
-- campos abajo son el mínimo para que Identity & Access funcione: FK de tenant y `country_code`
-- que UC-ID-03 exige para el aviso de privacidad paramétrico por jurisdicción (arquitectura §7.1,
-- LFPDPPP/GDPR/LGPD). Ampliar cuando Configuration Studio necesite más campos — no inventar aquí
-- lo que no se necesita todavía.

create extension if not exists pgcrypto;

-- ─── Organization (tenant) ───────────────────────────────────────────────────
-- [propuesto, mínimo] — no lleva RLS: es la tabla que DEFINE qué es un tenant.
create table organization (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  country_code  varchar(2) not null, -- ISO 3166-1 alpha-2
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── User (global, sin tenant_id — arquitectura §3.4) ────────────────────────
create table "user" (
  id             uuid primary key default gen_random_uuid(),
  full_name      text not null,
  email          varchar(320) unique,
  phone          varchar(32) unique,
  date_of_birth  date not null, -- obligatorio (RFP §6) — bloquea el alta si falta, UC-ID-01
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint user_email_or_phone_required check (email is not null or phone is not null)
);

-- ─── UserTenantRole ────────────────────────────────────────────────────────────
-- Multi-rol/multi-tenant vía múltiples filas (UC-ID-02) — NO modela multi-equipo/deporte
-- (roster_membership/team, Sports Hub, fuera de este repo — ver plan de Identity & Access).
create type tenant_role as enum ('player', 'coach', 'admin', 'parent', 'director');
create type tenant_role_status as enum ('pending', 'active', 'revoked');

create table user_tenant_role (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organization(id),
  user_id          uuid not null references "user"(id),
  role             tenant_role not null,
  status           tenant_role_status not null default 'pending',
  -- MFA obligatorio para admin/director y cualquier rol con acceso a Admin Hub/Payments,
  -- opcional para coach, no aplica a menores (UC-ID-04) — este campo es lo que el guard de la
  -- app exige; la verificación real de MFA la hace el proveedor externo (Auth0/Cognito).
  mfa_enabled      boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- No está explícito en los casos de uso, pero se sigue del principio "nunca duplicar dato"
  -- del CLAUDE.md: una persona no debería tener el mismo rol duplicado en el mismo tenant.
  unique (organization_id, user_id, role)
);
create index idx_user_tenant_role_org on user_tenant_role(organization_id);

-- ─── GuardianLink ──────────────────────────────────────────────────────────────
-- UC-ID-03. consent_status: requested -> granted|revoked. Nunca hay activación automática por
-- vencimiento de plazo — si el tutor niega o no responde, la cuenta queda pending indefinidamente
-- (criterio de aceptación explícito del documento fuente).
create type consent_status as enum ('requested', 'granted', 'revoked');

create table guardian_link (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references organization(id),
  guardian_user_id       uuid not null references "user"(id),
  athlete_user_id        uuid not null references "user"(id),
  consent_status         consent_status not null default 'requested',
  -- Inmutable una vez capturado (criterio de aceptación UC-ID-03) — la app nunca hace UPDATE
  -- sobre estos dos campos después de setearlos; solo puede transicionar consent_status a
  -- `revoked` en un caso de revocación posterior (UC-ID-05), que es un evento nuevo, no una
  -- edición del consentimiento original.
  consent_captured_at    timestamptz,
  privacy_notice_version text, -- qué aviso de privacidad exacto se mostró — auditable (UC-ID-03)
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index idx_guardian_link_org on guardian_link(organization_id);
create index idx_guardian_link_athlete on guardian_link(athlete_user_id);

-- ─── AuditLog (transversal — no exclusiva de Identity) ────────────────────────
-- Vive en esta migración porque es el primer dominio que la necesita; se consume desde
-- src/shared/audit-log/ para que Admin Hub/Payments/Configuration la reusen sin duplicar tabla.
create table audit_log (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization(id),
  actor_user_id   uuid not null references "user"(id),
  entity_type     varchar(64) not null,
  entity_id       uuid not null,
  field_changed   varchar(128), -- null = alta/baja completa, no edición de campo
  old_value       jsonb,
  new_value       jsonb,
  occurred_at     timestamptz not null default now()
);
create index idx_audit_log_org on audit_log(organization_id);
create index idx_audit_log_entity on audit_log(entity_type, entity_id);

-- ─── Row-Level Security ────────────────────────────────────────────────────────
-- `organization` y `user` NO llevan RLS por tenant: organization DEFINE los tenants, user es
-- global por diseño (arquitectura §3.4). Las 3 tablas tenant-scoped sí.
--
-- current_setting('app.tenant_id', true) con missing_ok=true regresa NULL si nadie corrió
-- SET LOCAL app.tenant_id en la transacción — NULL::uuid = organization_id nunca es true, así
-- que sin el SET LOCAL explícito no se ve ninguna fila. FORCE ROW LEVEL SECURITY aplica la
-- política incluso al dueño de la tabla (el rol con el que corre la app), no solo a otros roles.

alter table user_tenant_role enable row level security;
alter table user_tenant_role force row level security;
create policy tenant_isolation on user_tenant_role
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table guardian_link enable row level security;
alter table guardian_link force row level security;
create policy tenant_isolation on guardian_link
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table audit_log enable row level security;
alter table audit_log force row level security;
create policy tenant_isolation on audit_log
  using (organization_id = current_setting('app.tenant_id', true)::uuid);
