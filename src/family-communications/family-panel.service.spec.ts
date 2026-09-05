import { describe, expect, it, vi } from 'vitest';
import { FamilyPanelService } from './family-panel.service.js';

const ORG_ID = 'org-1';
const TUTOR_ID = 'tutor-1';

function guardianConsentServiceFalso(athleteIds: string[]) {
  return { listarAtletasDeGuardian: vi.fn().mockResolvedValue(athleteIds) };
}
function playerCardQueryServiceFalso() {
  return {
    consultar: vi.fn(({ athleteUserId }: { athleteUserId: string }) =>
      Promise.resolve({
        administrativo: { restricted: false, data: { user: { id: athleteUserId } } },
        pagos: { restricted: false, data: { saldoActual: 100 } },
        calendario: { restricted: false, data: { events: [] } },
        galeria: { restricted: false, data: { assets: [] } },
      }),
    ),
  };
}

// UC-FAM-01 — un test por criterio de aceptación textual.
describe('FamilyPanelService', () => {
  it('1a: agrupa el panel por atleta — un elemento por cada guardian_link, sin mezclar entre hermanos', async () => {
    const playerCardService = playerCardQueryServiceFalso();
    const service = new FamilyPanelService(guardianConsentServiceFalso(['hijo-1', 'hijo-2']) as never, playerCardService as never);

    const resultado = await service.consultar({ organizationId: ORG_ID, actorUserId: TUTOR_ID, actorRoles: ['parent'] });

    expect(resultado).toHaveLength(2);
    expect(resultado[0].athleteId).toBe('hijo-1');
    expect(resultado[1].athleteId).toBe('hijo-2');
    expect(playerCardService.consultar).toHaveBeenCalledTimes(2);
  });

  it('regresa un panel vacío si el actor no tiene ningún guardian_link', async () => {
    const service = new FamilyPanelService(guardianConsentServiceFalso([]) as never, playerCardQueryServiceFalso() as never);

    await expect(service.consultar({ organizationId: ORG_ID, actorUserId: TUTOR_ID, actorRoles: ['parent'] })).resolves.toEqual([]);
  });

  it('respeta el mismo mecanismo de dato restringido que la Player Card — reutiliza el resultado tal cual, no lo reconstruye', async () => {
    const playerCardService = playerCardQueryServiceFalso();
    const service = new FamilyPanelService(guardianConsentServiceFalso(['hijo-1']) as never, playerCardService as never);

    const resultado = await service.consultar({ organizationId: ORG_ID, actorUserId: TUTOR_ID, actorRoles: ['parent'] });

    expect(playerCardService.consultar).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: ORG_ID, actorUserId: TUTOR_ID, athleteUserId: 'hijo-1' }),
    );
    expect(resultado[0].saldo).toBe(resultado[0].resumenJugador.pagos);
    expect(resultado[0].calendario).toBe(resultado[0].resumenJugador.calendario);
    expect(resultado[0].galeria).toBe(resultado[0].resumenJugador.galeria);
  });
});
