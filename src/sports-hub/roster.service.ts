import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import { UsersService } from '../identity-access/users.service.js';
import { TeamService } from './team.service.js';
import type { RosterMembershipRow, RosterMembershipStatus, RosterRole } from './sports-hub.types.js';

export interface CrearRosterMembershipInput {
  organizationId: string;
  actorUserId: string;
  teamId: string;
  userId: string;
  role: RosterRole;
  jerseyNumber?: number | null;
  position?: string | null;
  // [propuesto]: el UC describe "la organización configuró explícitamente la doble militancia"
  // como una regla a nivel organización que no existe todavía (no hay tabla de config para esto).
  // Se traduce a un flag explícito por solicitud — honesto sobre lo que no está implementado (un
  // toggle persistente por organización) sin dejar de cumplir el comportamiento de seguridad
  // descrito: "de lo contrario, alerta antes de confirmar."
  confirmDualMembership?: boolean;
}

export interface DesactivarRosterMembershipInput {
  organizationId: string;
  actorUserId: string;
  rosterMembershipId: string;
}

// UC-SPT-03 — Armar y editar roster de equipo.
@Injectable()
export class RosterService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLog: AuditLogService,
    private readonly usersService: UsersService,
    private readonly teamService: TeamService,
  ) {}

  async crear(input: CrearRosterMembershipInput): Promise<RosterMembershipRow> {
    const team = await this.teamService.obtenerPorId(input.organizationId, input.teamId);
    if (!team) throw new NotFoundException('team no encontrado.');

    // 2a. "La persona no tiene rol activo en la organización → el sistema bloquea el alta al
    // roster hasta resolver el rol base (no se crea un roster_membership huérfano)."
    const tieneRolActivo = await this.usersService.tieneRolActivoEnOrganizacion(input.organizationId, input.userId);
    if (!tieneRolActivo) {
      throw new BadRequestException(
        'La persona no tiene un rol activo en la organización — resolver el alta base (UC-ID-01/02) antes de incorporarla al roster.',
      );
    }

    return this.db.withTenant(input.organizationId, async (client) => {
      // 3a. Doble militancia: mismo deporte, misma temporada, otro equipo, membresía activa.
      if (!input.confirmDualMembership) {
        const { rows: otrasMembresias } = await client.query<RosterMembershipRow>(
          `select rm.* from roster_membership rm
           join team t on t.id = rm.team_id
           where rm.user_id = $1 and rm.status = 'active' and rm.team_id <> $2 and t.sport = $3 and t.season_id = $4`,
          [input.userId, input.teamId, team.sport, team.season_id],
        );
        if (otrasMembresias.length > 0) {
          throw new ConflictException(
            'Esta persona ya tiene una membresía activa en otro equipo del mismo deporte y temporada — confirma explícitamente para permitir doble militancia (confirmDualMembership).',
          );
        }
      }

      let membership: RosterMembershipRow;
      try {
        const { rows } = await client.query<RosterMembershipRow>(
          `insert into roster_membership (organization_id, team_id, user_id, role, jersey_number, position, status)
           values ($1, $2, $3, $4, $5, $6, 'active')
           returning *`,
          [input.organizationId, input.teamId, input.userId, input.role, input.jerseyNumber ?? null, input.position ?? null],
        );
        membership = rows[0];
      } catch (e) {
        if (this.esViolacionDeUnicidad(e)) {
          throw new ConflictException('Esta persona ya tiene una membresía activa en este equipo.');
        }
        throw e;
      }

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'roster_membership',
        entityId: membership.id,
        newValue: { teamId: membership.team_id, userId: membership.user_id, role: membership.role },
      });

      return membership;
    });
  }

  // 5. "Para bajas: coach/admin marca el roster_membership como inactivo — no se elimina."
  async desactivar(input: DesactivarRosterMembershipInput): Promise<RosterMembershipRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<RosterMembershipRow>(`select * from roster_membership where id = $1`, [
        input.rosterMembershipId,
      ]);
      const anterior = rows[0];
      if (!anterior) throw new NotFoundException('roster_membership no encontrado.');

      const { rows: updated } = await client.query<RosterMembershipRow>(
        `update roster_membership set status = 'inactive' where id = $1 returning *`,
        [input.rosterMembershipId],
      );

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'roster_membership',
        entityId: anterior.id,
        fieldChanged: 'status',
        oldValue: { status: anterior.status },
        newValue: { status: 'inactive' },
      });

      return updated[0];
    });
  }

  // Criterio de aceptación: "el histórico de rosters de temporadas anteriores permanece
  // consultable después de que un jugador cause baja" — sin filtro regresa todo (activo + inactivo).
  async listarPorEquipo(
    organizationId: string,
    teamId: string,
    opciones: { status?: RosterMembershipStatus } = {},
  ): Promise<RosterMembershipRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      if (opciones.status) {
        const { rows } = await client.query<RosterMembershipRow>(
          `select * from roster_membership where team_id = $1 and status = $2 order by created_at`,
          [teamId, opciones.status],
        );
        return rows;
      }
      const { rows } = await client.query<RosterMembershipRow>(
        `select * from roster_membership where team_id = $1 order by created_at`,
        [teamId],
      );
      return rows;
    });
  }

  private esViolacionDeUnicidad(e: unknown): boolean {
    return typeof e === 'object' && e !== null && (e as { code?: string }).code === '23505';
  }
}
