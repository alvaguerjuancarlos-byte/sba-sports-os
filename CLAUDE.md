# CLAUDE.md — SBA Sports OS

Contexto de proyecto para Claude Code. Este archivo es la referencia rápida — el detalle completo vive en los documentos fuente listados al final, léelos antes de tomar decisiones de diseño que este archivo no cubra.

## Qué es esto

SaaS de gestión para escuelas y academias deportivas en México/LatAm (modelo B2B2C, freemium + fees transaccionales). Cliente ancla: SBA, vía RFP formal. Referencia de producto: 360Player, acotado a escuelas formativas — no a la capa de clubes/ligas grandes (ver documento de arquitectura §1.2 para el detalle de posicionamiento).

16 módulos del RFP, organizados en 7 fases (Fase 0 discovery, Fase 1 UX/UI, Fase 2-6 construcción). **Este repo arranca por Fase 2 (MVP1 Business Core)** — no por Fase 3, aunque el orden "natural" del roadmap pondría Sports Core primero. Fase 2 se adelantó porque es la que se está construyendo con recursos propios ahora mismo; el resto de las fases sigue el orden del Plan Maestro.

## Estado del módulo financiero — leer antes de tocar Admin Hub o Payments & Billing

Un socio externo tiene avance propio de un módulo administrativo/financiero, en un repo/servicio aparte, **no integrado y no confirmado como fuente definitiva todavía**. La decisión tomada por ahora es: **este repo construye Admin Hub y Payments & Billing completos, según los casos de uso documentados** (no como stub, no como contrato de integración con el servicio del socio). Si en el futuro se decide reconciliar ambos, será un ejercicio de integración/migración posterior — no asumas hoy que hay que dejar espacio para un contrato de API externo en este dominio. Si ves referencias previas a "financial service boundary" o similar en historial de diseño, están obsoletas frente a esta decisión.

## Principios de arquitectura — no negociables

- **Monolito modular**, no microservicios. Fronteras de dominio respetadas a nivel de código/esquema desde el día 1 — un dominio nunca lee/escribe directo el esquema de otro, siempre vía su capa de servicio interna, aunque estén en el mismo proceso.
- **Multi-tenancy**: esquema compartido + Row-Level Security nativo de Postgres. Todo query de negocio va filtrado por `tenant_id` a nivel de RLS, no solo a nivel de aplicación.
- **Identidad**: una persona = un `user` global; roles y pertenencia a tenant/equipo van en `user_tenant_role` / `roster_membership`. Nunca hardcodear un rol único por persona — alguien puede ser coach en un tenant y padre en otro, o jugador de dos deportes a la vez.
- **Agentes de IA actúan solo vía APIs de dominio, nunca escritura directa a base de datos.** Esto aplica a cualquier automatización, no solo a los agentes formales de la capa de IA.
- **Salvaguarda de menores es un requisito duro, no una feature.** Cualquier flujo que toque a un atleta menor de edad necesita `guardian_link.consent_status = granted` antes de activar la cuenta — ver UC-ID-01/03.
- **Estados de dato restringido, no ocultamiento silencioso.** Campos sensibles (beca, médico, HR, financiero) se marcan explícitamente como "acceso restringido" para quien no tiene el scope — nunca se omiten sin explicación ni se mezclan con datos normales.
- **Auditoría completa.** Todo cambio a un dato sensible o financiero genera entrada en `audit_log` (quién, qué campo, cuándo) — sin excepciones por tipo de dato.
- **Nunca se duplica dato entre dominios.** Vistas agregadas (ej. resumen de cuenta en otro módulo) leen de la fuente única de verdad, no copian el dato.

## Stack

- Backend: **NestJS + TypeScript**, monolito modular
- Frontend: **Next.js** (web), **React Native** (móvil)
- DB: **PostgreSQL con RLS**
- Pagos: **Stripe** — tokenización delegada al proveedor, PCI-DSS SAQ-A, nunca se almacena PAN/CVV
- CFDI (México): PAC externo (Facturama / SW Sapien / Finkok) vía `InvoicingProviderAdapter` — no acoplar `invoice`/`transaction` a un SDK específico
- Auth: **Auth0 / Cognito**
- Infra: **AWS Fargate + Terraform**, OpenTelemetry
- Event bus: **AWS SNS + SQS con patrón Transactional Outbox** sobre Postgres (arquitectura §3.5) — la escritura de negocio y la fila de `outbox_event` van en la misma transacción
- Entornos: **3 cuentas AWS separadas** (dev/staging/prod) bajo una AWS Organization — nunca datos reales fuera de prod (arquitectura §8, Topología de entornos)

## Alcance de este repo ahora mismo — Fase 2 (MVP1 Business Core)

4 dominios, 23 casos de uso (13 completos, 10 condensados). Fuente completa: `Funcionalidades y Casos de Uso — Fase 0-2 (MVP1 Business Core)` v1.0.

**Identity & Access** — `user`, `user_tenant_role`, `guardian_link`, `audit_log`. Alta con rol inicial, multi-rol/multi-deporte, consentimiento de tutor para menores, MFA para roles admin/financieros, revocación de acceso.

**Configuration Studio (mínimo viable)** — dimensiones financieras y catálogo de productos/servicios configurables, import/export, log de auditoría de cambios. Se completa en Fase 6, aquí solo lo indispensable para que Admin Hub y Payments tengan catálogo sobre el cual operar.

**Admin Hub** — `budget_line`, `purchase_request`, `purchase_order`, `actual_posting`, `vendor`, `financial_dimension`. El ciclo Purchase-to-Pay es la regla de negocio más sensible del dominio: `purchase_order` crea un `commitment`; `actual_posting` lo libera/consume — nunca coexisten duplicados para el mismo gasto. Purchase Request se valida contra presupuesto aprobado con ruteo dentro-de-presupuesto vs. excepción.

**Payments & Billing** — `invoice`, `transaction`, `membership_plan`, además de `financial_dimension` (compartida con Admin Hub) y `notification_log`. Incluye el servicio más consumido por el resto de la plataforma: **UC-PAY-05, evaluación de elegibilidad financiera en tiempo real** — expuesto para que otros dominios (Call-up Engine, cuando se construya) lo consuman sin acceso directo a `invoice`. Nunca implementar como batch nocturno — el RFP exige respuesta en el mismo request que la necesita.

## Lo que NO se construye todavía en este repo

CRM & Enrollment, Sports Hub, Calendar & RSVP, Call-up Engine, Match Center, Player Card, Weekly Coach Feedback, Performance, Attendance/Real-Time, Facilities & Inventory, HR/Coach Hub, Family & Communications, Reporting & AI avanzado. Todos referencian entidades de Fase 2 (especialmente `invoice`, `user`, `user_tenant_role`) — si necesitas anticipar una integración futura, revisa el documento de arquitectura §4 antes de inventar un contrato.

## Criterios de aceptación

Cada caso de uso en los documentos fuente trae su propia lista de "Criterios de aceptación" — son la referencia para escribir tests, no una sugerencia. Ejemplo real (UC-PAY-03): "Ningún campo de `transaction` contiene número de tarjeta o CVV — solo `provider_txn_id`." Ese tipo de afirmación se traduce directo a un test, no se reinterpreta.

## Documentos fuente (autoridad, en este orden)

1. `Documento Maestro — Arquitectura SBA Sports OS` v1.1 — arquitectura, modelo de datos, seguridad, stack completo
2. `Funcionalidades y Casos de Uso — Fase 0-2 (MVP1 Business Core)` v1.0 — el detalle de lo que este repo construye ahora
3. `Plan Maestro de Desarrollo — SBA Sports OS` v1.0 — fases, secuenciación, dependencias entre módulos
4. RFP `SBA Sports OS Development` v1.0 — fuente original de todo requisito citado como `[RFP]` en los documentos anteriores

Si algo en este archivo contradice a los documentos fuente, los documentos fuente ganan — este archivo es un resumen operativo, no la especificación.

## Documentos fuente — ubicación local

Los documentos fuente completos (arquitectura, casos de uso, diagramas de proceso, plan maestro, diccionario de datos, RFP) viven en:
`C:\Users\Administrator\Documents\Escuela deportiva plataforma\`
