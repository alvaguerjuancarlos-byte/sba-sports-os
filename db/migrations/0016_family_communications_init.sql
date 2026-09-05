-- Family & Communications — SBA Sports OS, Fase 6 (People/Experience & AI)
--
-- Fuentes: Funcionalidades y Casos de Uso Fase 6 v1.1 (UC-FAM-01 a 03, texto completo leído).
--
-- Decisiones de alcance:
-- - `notification_log` ya existía desde Payments & Billing (0004, UC-PAY-06) con un comentario
--   explícito: "la resolución real del canal es Family & Communications (Fase 6, fuera de
--   alcance)". Este es ese momento — se EXTIENDE la tabla existente (ALTER, no una tabla nueva
--   paralela) con `notification_type` y `status`, con defaults que preservan exactamente el
--   comportamiento de la fila que UC-PAY-06 ya inserta (channel='email', ahora
--   notification_type='payment_reminder' por default).
-- - Modelo de "una fila por canal, no un array de canales en una fila": "todo evento notificable
--   genera un notification_log, incluso si ningún canal externo está habilitado" (UC-FAM-02,
--   literal) se satisface creando SIEMPRE una fila con channel='in_app' (esa fila ES la bandeja
--   in-app — no hay una tabla de bandeja separada), más una fila adicional por cada canal externo
--   (push/email) que el destinatario tenga habilitado en notification_preference. Evita un jsonb
--   de canales, que no cambiaría el comportamiento pero sí complicaría la columna existente.
-- - `notification_preference` (nueva) — cierra la brecha [ABIERTO] que el propio documento fuente
--   identifica en su sección 6 para UC-FAM-03, con las columnas que ahí se proponen.
-- - **Wiring de disparo NO implementado**: este dominio expone `NotificationService.crear()` para
--   que otros módulos lo llamen en sus propios eventos notificables (factura nueva, RSVP
--   pendiente, convocatoria, evento en vivo, galería) — pero ningún módulo existente (Payments,
--   Calendar & RSVP, Call-up Engine, Match Center, Player Card) se modifica en este cambio para
--   llamarlo. Cablear cada disparador es trabajo de integración en 5+ dominios ya construidos y
--   comiteados — fuera de alcance de este incremento, documentado explícitamente en vez de
--   simulado a medias. UC-FAM-02 se implementa y verifica invocando `crear()` directamente, como
--   lo haría cualquiera de esos módulos.

alter table notification_log add column notification_type text not null default 'payment_reminder';

create type notification_status as enum ('unread', 'read', 'dismissed');
alter table notification_log add column status notification_status not null default 'unread';

create type notification_channel as enum ('push', 'in_app', 'email');

-- UC-FAM-03, condensado. Solo push/email son canales "opcionales" gateados por preferencia —
-- in_app nunca se filtra por preferencia (ver nota arriba: la fila misma ES la bandeja).
create table notification_preference (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references organization(id),
  user_id             uuid not null references "user"(id),
  notification_type   text not null,
  channel             notification_channel not null,
  enabled             boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (organization_id, user_id, notification_type, channel)
);
create index idx_notification_preference_org on notification_preference(organization_id);
create index idx_notification_preference_user on notification_preference(user_id);

alter table notification_preference enable row level security;
alter table notification_preference force row level security;
create policy tenant_isolation on notification_preference
  using (organization_id = current_setting('app.tenant_id', true)::uuid);
