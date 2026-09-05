-- Attendance / Real-Time — SBA Sports OS, Fase 3 (Sports Core)
--
-- Fuentes: Funcionalidades y Casos de Uso Fase 3 v1.0 (UC-ATT-01 a UC-ATT-05, texto completo
-- leído). Sin diccionario-datos-fase3.md — modelo interpretado directo del texto.
--
-- Decisión de alcance: no se construye reconocimiento facial propio — igual que Stripe/Auth0 en
-- fases anteriores, la plataforma solo recibe el RESULTADO de un proveedor biométrico gestionado
-- (arquitectura §8) y almacena `provider_ref` — nunca imágenes crudas (arquitectura §7.3,
-- minimización de datos). No hay un caso de uso explícito de "enrolar" el template biométrico —
-- se modela como una acción mínima implícita junto al consentimiento (ver
-- biometric-consent.service.ts), igual que `venue` se modeló implícito en Calendar & RSVP.
--
-- Excepción deliberada al principio de "nunca borrar" de todo el resto del sistema:
-- `biometric_template` SÍ se borra físicamente al revocar consentimiento — criterio de aceptación
-- literal: "ningún biometric_template sobrevive a un consent_status = revoked... revocación
-- implica eliminación del template, no solo desactivación" (arquitectura §7.3). Es la única tabla
-- de todo el esquema con DELETE real, y es intencional, no un descuido.

create type biometric_consent_status as enum ('granted', 'revoked');

-- Una fila por usuario — "niega" (primera vez) y "revoca" (deshacer un otorgamiento previo)
-- resultan en el mismo estado final (revoked) sobre el mismo registro, no historial de intentos.
create table biometric_consent (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization(id),
  user_id         uuid not null references "user"(id),
  consent_status  biometric_consent_status not null,
  granted_at      timestamptz,
  revoked_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index idx_biometric_consent_org on biometric_consent(organization_id);

create table biometric_template (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization(id),
  user_id         uuid not null references "user"(id),
  provider_ref    text not null,
  created_at      timestamptz not null default now()
);
create index idx_biometric_template_org on biometric_template(organization_id);
create index idx_biometric_template_user on biometric_template(user_id);

-- UC-ATT-01/02. `confirmed_by` obligatorio solo para manual_fallback ("nunca queda
-- auto-confirmado") — se aplica como check, no como NOT NULL absoluto, porque facial no lo lleva.
create type checkin_method as enum ('facial', 'manual_fallback');

create table checkin_event (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organization(id),
  event_id              uuid not null references event(id),
  user_id               uuid not null references "user"(id),
  method                checkin_method not null,
  confirmed_by          uuid references "user"(id),
  flagged_for_review    boolean not null default false,
  checked_in_at         timestamptz not null default now(),
  created_at            timestamptz not null default now(),
  constraint checkin_confirmed_by_requerido_en_manual
    check (method <> 'manual_fallback' or confirmed_by is not null),
  -- Una persona no hace check-in dos veces al mismo evento.
  unique (event_id, user_id)
);
create index idx_checkin_event_org on checkin_event(organization_id);
create index idx_checkin_event_event on checkin_event(event_id);
-- UC-ATT-04: "lectura directa de checkin_event sin re-cómputo pesado" — el aforo por sede necesita
-- cruzar por event.venue_id, así que el índice relevante vive en event (idx_event_venue_horario,
-- migración 0006); aquí solo se indexa lo que esta tabla resuelve directo (por evento).

-- ─── Row-Level Security ────────────────────────────────────────────────────────
alter table biometric_consent enable row level security;
alter table biometric_consent force row level security;
create policy tenant_isolation on biometric_consent
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table biometric_template enable row level security;
alter table biometric_template force row level security;
create policy tenant_isolation on biometric_template
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table checkin_event enable row level security;
alter table checkin_event force row level security;
create policy tenant_isolation on checkin_event
  using (organization_id = current_setting('app.tenant_id', true)::uuid);
