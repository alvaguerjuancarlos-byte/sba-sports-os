import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { ProspectService } from './prospect.service.js';
import { EventService } from '../calendar-rsvp/event.service.js';
import type { TrialClassAttendanceRow } from './crm-enrollment.types.js';

export interface AgendarClaseDePruebaInput {
  organizationId: string;
  actorUserId: string;
  prospectId: string;
  eventId: string;
}

export interface MarcarAsistenciaInput {
  organizationId: string;
  actorUserId: string;
  trialClassAttendanceId: string;
  attended: boolean;
}

// UC-CRM-02 — Agendar y registrar clase de prueba.
@Injectable()
export class TrialClassService {
  constructor(
    private readonly db: DatabaseService,
    private readonly prospectService: ProspectService,
    private readonly eventService: EventService,
  ) {}

  // Precondiciones: "Existe prospect con stage = trial; existe event de la sesión."
  async agendar(input: AgendarClaseDePruebaInput): Promise<TrialClassAttendanceRow> {
    const prospecto = await this.prospectService.obtenerPorId(input.organizationId, input.prospectId);
    if (!prospecto) throw new NotFoundException('prospect no encontrado.');
    if (prospecto.stage !== 'trial') {
      throw new BadRequestException('El prospect debe estar en stage=trial para agendar una clase de prueba.');
    }

    const evento = await this.eventService.obtenerPorId(input.organizationId, input.eventId);
    if (!evento) throw new NotFoundException('event no encontrado.');

    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<TrialClassAttendanceRow>(
        `insert into trial_class_attendance (organization_id, prospect_id, event_id, attended)
         values ($1, $2, $3, null)
         returning *`,
        [input.organizationId, input.prospectId, input.eventId],
      );
      return rows[0];
    });
  }

  // Criterio de aceptación: "el campo attended es explícito (true/false), nunca inferido de la
  // ausencia de registro" — este método es la ÚNICA forma de fijarlo; nunca hay un default a
  // false por un cron/job de cierre de evento.
  async marcarAsistencia(input: MarcarAsistenciaInput): Promise<TrialClassAttendanceRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<TrialClassAttendanceRow>(
        `update trial_class_attendance set attended = $2, updated_at = now() where id = $1 returning *`,
        [input.trialClassAttendanceId, input.attended],
      );
      if (!rows[0]) throw new NotFoundException('trial_class_attendance no encontrado.');
      return rows[0];
    });
  }

  async listarPorProspecto(organizationId: string, prospectId: string): Promise<TrialClassAttendanceRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<TrialClassAttendanceRow>(
        `select * from trial_class_attendance where prospect_id = $1 order by created_at desc`,
        [prospectId],
      );
      return rows;
    });
  }
}
