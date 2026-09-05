import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { EventService } from '../calendar-rsvp/event.service.js';
import { CallupListService } from '../callup-engine/callup-list.service.js';
import type { MatchLineupRow, MatchScoreRow } from './match-center.types.js';

export interface TitularInput {
  callupSlotId: string;
  position: string;
  formationSlot: string;
}

export interface AsignarAlineacionInput {
  organizationId: string;
  actorUserId: string;
  eventId: string;
  titulares: TitularInput[];
}

export interface IniciarPartidoInput {
  organizationId: string;
  actorUserId: string;
  eventId: string;
}

// UC-MAT-01 — Armar alineación inicial y formación. "La banca de suplentes" no se persiste aparte
// — cualquier callup_slot 'accepted' de la convocatoria que todavía no tiene fila en match_lineup
// para este evento ES, por definición, un suplente disponible (se consulta, no se declara).
@Injectable()
export class MatchLineupService {
  constructor(
    private readonly db: DatabaseService,
    private readonly eventService: EventService,
    private readonly callupListService: CallupListService,
  ) {}

  async asignarAlineacion(input: AsignarAlineacionInput): Promise<MatchLineupRow[]> {
    const event = await this.eventService.obtenerPorId(input.organizationId, input.eventId);
    if (!event) throw new NotFoundException('event no encontrado.');

    return this.db.withTenant(input.organizationId, async (client) => {
      const lineups: MatchLineupRow[] = [];
      for (const titular of input.titulares) {
        // 3a. "Coach intenta alinear a un jugador que no está confirmado en la convocatoria → el
        // sistema lo bloquea — solo se puede alinear a quien pasó por Call-up Engine."
        const slot = await this.callupListService.obtenerSlotConfirmado(input.organizationId, input.eventId, titular.callupSlotId);
        if (!slot) {
          throw new BadRequestException(
            `El callup_slot ${titular.callupSlotId} no está confirmado (aceptado) en la convocatoria de este evento.`,
          );
        }

        try {
          const { rows } = await client.query<MatchLineupRow>(
            `insert into match_lineup (organization_id, event_id, callup_slot_id, user_id, position, formation_slot, is_starter, is_active)
             values ($1, $2, $3, $4, $5, $6, true, true)
             returning *`,
            [input.organizationId, input.eventId, slot.id, slot.user_id, titular.position, titular.formationSlot],
          );
          lineups.push(rows[0]);
        } catch (e) {
          if (this.esViolacionDeUnicidad(e)) {
            throw new ConflictException(`El callup_slot ${titular.callupSlotId} ya tiene una fila de alineación para este evento.`);
          }
          throw e;
        }
      }
      return lineups;
    });
  }

  // Criterio de aceptación: "match_score se crea en el mismo momento en que el partido pasa a
  // status = live, no antes ni en un paso separado" — se crea ya con status='live', nunca hay una
  // transición posterior para llegar a ese estado inicial.
  async iniciarPartido(input: IniciarPartidoInput): Promise<MatchScoreRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      try {
        const { rows } = await client.query<MatchScoreRow>(
          `insert into match_score (organization_id, event_id, team_score, opponent_score, status)
           values ($1, $2, 0, 0, 'live')
           returning *`,
          [input.organizationId, input.eventId],
        );
        return rows[0];
      } catch (e) {
        if (this.esViolacionDeUnicidad(e)) throw new ConflictException('Este partido ya fue iniciado.');
        if (this.esViolacionDeFk(e)) throw new NotFoundException('event no encontrado.');
        throw e;
      }
    });
  }

  // Lectura para el frontend — sin esto no hay forma de saber quién está activo en la cancha para
  // construir el formulario de un match_event (gol/sustitución/tarjeta necesita playerLineupId).
  async listarPorEvento(organizationId: string, eventId: string): Promise<MatchLineupRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<MatchLineupRow>(`select * from match_lineup where event_id = $1 order by is_starter desc, created_at`, [
        eventId,
      ]);
      return rows;
    });
  }

  private esViolacionDeUnicidad(e: unknown): boolean {
    return typeof e === 'object' && e !== null && (e as { code?: string }).code === '23505';
  }

  private esViolacionDeFk(e: unknown): boolean {
    return typeof e === 'object' && e !== null && (e as { code?: string }).code === '23503';
  }
}
