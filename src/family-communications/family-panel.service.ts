import { Injectable } from '@nestjs/common';
import { GuardianConsentService } from '../identity-access/guardian-consent.service.js';
import { PlayerCardQueryService } from '../player-card/player-card-query.service.js';
import type { PlayerCardResultado } from '../player-card/player-card-query.service.js';

export interface ConsultarPanelFamiliarInput {
  organizationId: string;
  actorUserId: string;
  actorRoles: string[];
}

export interface PanelDeAtleta {
  athleteId: string;
  // "resumen del jugador (extracto no restringido de la Player Card, UC-PLC-01)" — se reutiliza
  // la Player Card completa en vez de reconstruir el ensamblado: "el panel familiar respeta
  // exactamente el mismo mecanismo de estados de dato restringido que la Player Card" (criterio de
  // aceptación, literal) se cumple por construcción al ser el MISMO resultado, no una copia.
  resumenJugador: PlayerCardResultado;
  // Promovidos a nivel superior desde el mismo resumenJugador — "balances, invoices, calendar,
  // RSVP... gallery" (RFP §4) son secciones que el RFP nombra aparte de "player summary"; aquí son
  // la MISMA sección de la Player Card, solo expuestas con el nombre que usa este caso de uso, sin
  // volver a calcularlas.
  saldo: PlayerCardResultado['pagos'];
  calendario: PlayerCardResultado['calendario'];
  galeria: PlayerCardResultado['galeria'];
}

// UC-FAM-01 — Consultar panel familiar consolidado.
@Injectable()
export class FamilyPanelService {
  constructor(
    private readonly guardianConsentService: GuardianConsentService,
    private readonly playerCardQueryService: PlayerCardQueryService,
  ) {}

  // 1a: "el tutor tiene guardian_link con más de un atleta → el sistema agrupa el panel por
  // atleta, sin mezclar saldos o calendarios entre hermanos" — un arreglo con un elemento por
  // atleta, cada uno trazable a su propio registro, satisface esto por construcción.
  async consultar(input: ConsultarPanelFamiliarInput): Promise<PanelDeAtleta[]> {
    const athleteIds = await this.guardianConsentService.listarAtletasDeGuardian(input.organizationId, input.actorUserId);

    return Promise.all(
      athleteIds.map(async (athleteId) => {
        const resumenJugador = await this.playerCardQueryService.consultar({
          organizationId: input.organizationId,
          actorUserId: input.actorUserId,
          actorRoles: input.actorRoles,
          athleteUserId: athleteId,
        });

        return {
          athleteId,
          resumenJugador,
          saldo: resumenJugador.pagos,
          calendario: resumenJugador.calendario,
          galeria: resumenJugador.galeria,
        };
      }),
    );
  }
}
