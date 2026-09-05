import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import { RosterService } from '../sports-hub/roster.service.js';
import { tienePermisoDeExcepcion, type AttendanceRow, type EventRow, type EventType } from './calendar-rsvp.types.js';

export interface CrearEventoInput {
  organizationId: string;
  actorUserId: string;
  actorRoles: string[];
  type: EventType;
  teamId?: string | null;
  leagueCupId?: string | null;
  venueId: string;
  startAt: string;
  endAt: string;
  // 3. "Quien programa elige... o — si tiene permiso de excepción — forzar el traslape."
  forceOverlap?: boolean;
}

export interface CrearEventoResultado {
  event: EventRow;
  conflictosForzados: EventRow[];
  invitacionesGeneradas: number;
}

// UC-CAL-01 — Crear evento con sede. UC-CAL-02 — Detectar y resolver conflicto de recursos
// compartidos (embebido aquí: el flujo principal de CAL-01 literalmente deriva a CAL-02 en su
// paso 2, no son dos operaciones separadas de cara al usuario).
@Injectable()
export class EventService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLog: AuditLogService,
    private readonly rosterService: RosterService,
  ) {}

  async crear(input: CrearEventoInput): Promise<CrearEventoResultado> {
    if (input.endAt <= input.startAt) {
      throw new BadRequestException('end_at debe ser posterior a start_at.');
    }

    return this.db.withTenant(input.organizationId, async (client) => {
      // UC-CAL-02, paso 1: comparar contra TODOS los event existentes del mismo venue — la
      // comparación de rango se hace en SQL, nunca en JS sobre valores ya leídos (ver nota en la
      // migración 0006 sobre el parseo de timestamptz de `pg`).
      const { rows: conflictos } = await client.query<EventRow>(
        `select * from event where venue_id = $1 and status = 'scheduled' and start_at < $3 and end_at > $2`,
        [input.venueId, input.startAt, input.endAt],
      );

      if (conflictos.length > 0) {
        // 2. "El sistema bloquea la confirmación y presenta el conflicto específico."
        if (!input.forceOverlap) {
          throw new ConflictException({
            message: 'Existe un conflicto de horario en este venue.',
            conflictos: conflictos.map((c) => ({ id: c.id, startAt: c.start_at, endAt: c.end_at, teamId: c.team_id })),
          });
        }
        // 3a. "Quien programa no tiene permiso de excepción → la opción de forzar el traslape ni
        // siquiera se muestra; solo puede cambiar sede u horario."
        if (!tienePermisoDeExcepcion(input.actorRoles)) {
          throw new ForbiddenException('No tienes permiso de excepción para forzar un traslape de horario.');
        }
      }

      let event: EventRow;
      try {
        const { rows } = await client.query<EventRow>(
          `insert into event (organization_id, type, team_id, league_cup_id, venue_id, start_at, end_at, status)
           values ($1, $2, $3, $4, $5, $6, $7, 'scheduled')
           returning *`,
          [input.organizationId, input.type, input.teamId ?? null, input.leagueCupId ?? null, input.venueId, input.startAt, input.endAt],
        );
        event = rows[0];
      } catch (e) {
        if (this.esViolacionDeFk(e)) throw new NotFoundException('team_id, league_cup_id o venue_id indicado no existe.');
        throw e;
      }

      // 4. "El sistema registra la resolución elegida" — la excepción ejercida queda auditada
      // (UC-CAL-02 es el único de los dos casos de uso que lista audit_log entre sus entidades).
      if (conflictos.length > 0) {
        await this.auditLog.record(client, {
          organizationId: input.organizationId,
          actorUserId: input.actorUserId,
          entityType: 'event',
          entityId: event.id,
          fieldChanged: 'venue_overlap_exception',
          newValue: { conflictos: conflictos.map((c) => c.id), venueId: input.venueId },
        });
      }

      // UC-CAL-01, criterio de aceptación: "toda creación de evento dispara la generación de RSVP
      // para el roster relevante en la misma operación, no en un paso separado que pueda
      // omitirse." Un evento multi-equipo (team_id null) no tiene un roster único al que invitar.
      let invitacionesGeneradas = 0;
      if (input.teamId) {
        const roster = await this.rosterService.listarPorEquipo(input.organizationId, input.teamId, { status: 'active' });
        for (const miembro of roster) {
          const { rows: attendanceRows } = await client.query<AttendanceRow>(
            `insert into attendance (organization_id, event_id, user_id, status) values ($1, $2, $3, 'pending') returning *`,
            [input.organizationId, event.id, miembro.user_id],
          );
          if (attendanceRows[0]) invitacionesGeneradas++;
        }
      }

      return { event, conflictosForzados: conflictos.length > 0 ? conflictos : [], invitacionesGeneradas };
    });
  }

  private esViolacionDeFk(e: unknown): boolean {
    return typeof e === 'object' && e !== null && (e as { code?: string }).code === '23503';
  }
}
