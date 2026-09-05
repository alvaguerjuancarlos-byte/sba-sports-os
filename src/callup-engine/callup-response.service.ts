import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { UsersService } from '../identity-access/users.service.js';
import { GuardianConsentService } from '../identity-access/guardian-consent.service.js';
import { calcularEsMenorDeEdad } from '../identity-access/identity-access.types.js';
import { EligibilityService } from '../payments-billing/eligibility.service.js';
import { CallupPriorityService } from './callup-priority.service.js';
import type { CallupSlotRow } from './callup-engine.types.js';

export interface ResponderConvocatoriaInput {
  organizationId: string;
  actorUserId: string;
  callupSlotId: string;
  decision: 'accepted' | 'declined';
}

export interface ResponderConvocatoriaResultado {
  slot: CallupSlotRow;
  alternoPromovido: CallupSlotRow | null;
}

// UC-CUP-02 — Aceptar/declinar convocatoria.
@Injectable()
export class CallupResponseService {
  constructor(
    private readonly db: DatabaseService,
    private readonly usersService: UsersService,
    private readonly guardianConsentService: GuardianConsentService,
    private readonly eligibilityService: EligibilityService,
    private readonly callupPriorityService: CallupPriorityService,
  ) {}

  async responder(input: ResponderConvocatoriaInput): Promise<ResponderConvocatoriaResultado> {
    const slot = await this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<CallupSlotRow>(`select * from callup_slot where id = $1`, [input.callupSlotId]);
      return rows[0] ?? null;
    });
    if (!slot) throw new NotFoundException('callup_slot no encontrado.');
    if (slot.status !== 'called') {
      throw new ConflictException(`Este cupo ya no está pendiente de respuesta (status actual: '${slot.status}').`);
    }

    // Autorización: mismo patrón que RSVP (Calendar & RSVP) y consentimiento biométrico
    // (Attendance/Real-Time) — tutor si menor, el propio jugador si adulto.
    const jugador = await this.usersService.obtenerPorId(slot.user_id);
    if (!jugador) throw new NotFoundException('El jugador asociado a este cupo ya no existe.');

    const esMenor = calcularEsMenorDeEdad(new Date(jugador.date_of_birth));
    if (esMenor) {
      const esGuardian = await this.guardianConsentService.esGuardianDe(input.organizationId, input.actorUserId, slot.user_id);
      if (!esGuardian) {
        throw new ForbiddenException('Solo un tutor con guardian_link puede responder la convocatoria de un jugador menor de edad.');
      }
    } else if (input.actorUserId !== slot.user_id) {
      throw new ForbiddenException('Solo el propio jugador puede responder esta convocatoria.');
    }

    // 2a. "El sistema reevalúa la elegibilidad en tiempo real en el momento de la respuesta, nunca
    // reutiliza el estado calculado en UC-CUP-01." Flujo 2-3: solo si es elegible responde (acepta
    // o declina) — si está bloqueado, ve el banner de pago y no puede resolver el cupo todavía.
    const elegibilidad = await this.eligibilityService.consultar({
      organizationId: input.organizationId,
      athleteUserId: slot.user_id,
    });
    if (!elegibilidad.eligible) {
      throw new ForbiddenException({
        message: 'Esta persona tiene un saldo vencido cualificante — no puede responder la convocatoria hasta resolverlo.',
        blockingInvoiceId: elegibilidad.blockingInvoiceId,
        paymentLink: elegibilidad.paymentLink,
      });
    }

    const updated = await this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<CallupSlotRow>(
        `update callup_slot set status = $2, responded_at = now(), responded_by = $3 where id = $1 returning *`,
        [input.callupSlotId, input.decision, input.actorUserId],
      );
      return rows[0];
    });

    // 5. "Si declina, el sistema promueve automáticamente al siguiente jugador de la lista de
    // alternos priorizada para llenar el cupo liberado."
    let alternoPromovido: CallupSlotRow | null = null;
    if (input.decision === 'declined') {
      alternoPromovido = await this.callupPriorityService.promoverSiguienteAlterno(input.organizationId, slot.callup_list_id);
    }

    return { slot: updated, alternoPromovido };
  }
}
