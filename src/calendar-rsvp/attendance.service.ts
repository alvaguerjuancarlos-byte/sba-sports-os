import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { UsersService } from '../identity-access/users.service.js';
import { GuardianConsentService } from '../identity-access/guardian-consent.service.js';
import { calcularEsMenorDeEdad } from '../identity-access/identity-access.types.js';
import type { AttendanceRow, RsvpStatus } from './calendar-rsvp.types.js';

export interface ResponderRsvpInput {
  organizationId: string;
  actorUserId: string;
  attendanceId: string;
  decision: Extract<RsvpStatus, 'confirmed' | 'declined'>;
}

// UC-CAL-03 — RSVP de padre/tutor o jugador a un evento.
@Injectable()
export class AttendanceService {
  constructor(
    private readonly db: DatabaseService,
    private readonly usersService: UsersService,
    private readonly guardianConsentService: GuardianConsentService,
  ) {}

  async responder(input: ResponderRsvpInput): Promise<AttendanceRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<AttendanceRow>(`select * from attendance where id = $1`, [input.attendanceId]);
      const attendance = rows[0];
      if (!attendance) throw new NotFoundException('attendance no encontrado.');

      // "La primera respuesta registrada es la que cuenta" — inmutable una vez respondido.
      if (attendance.status !== 'pending') {
        throw new ConflictException(`Este RSVP ya fue respondido (status actual: '${attendance.status}').`);
      }

      // 1. "Si el jugador es menor de edad, la invitación llega al tutor vía guardian_link; si es
      // adulto, llega directo al jugador." — nunca se resuelve un RSVP de un menor sin pasar por
      // su tutor (criterio de aceptación).
      const atleta = await this.usersService.obtenerPorId(attendance.user_id);
      if (!atleta) throw new NotFoundException('El jugador asociado a este RSVP ya no existe.');

      const esMenor = calcularEsMenorDeEdad(new Date(atleta.date_of_birth));
      if (esMenor) {
        const esGuardian = await this.guardianConsentService.esGuardianDe(input.organizationId, input.actorUserId, attendance.user_id);
        if (!esGuardian) {
          throw new ForbiddenException('Solo un tutor con guardian_link puede responder el RSVP de un jugador menor de edad.');
        }
      } else if (input.actorUserId !== attendance.user_id) {
        throw new ForbiddenException('Solo el propio jugador puede responder este RSVP.');
      }

      const { rows: updated } = await client.query<AttendanceRow>(
        `update attendance set status = $2, responded_by = $3, responded_at = now() where id = $1 returning *`,
        [input.attendanceId, input.decision, input.actorUserId],
      );

      return updated[0];
    });
  }
}
