import { ForbiddenException, Injectable } from '@nestjs/common';
import { UsersService } from '../identity-access/users.service.js';
import { GuardianConsentService } from '../identity-access/guardian-consent.service.js';
import { RosterService } from '../sports-hub/roster.service.js';
import { TeamService } from '../sports-hub/team.service.js';
import { MatchQueryService } from '../match-center/match-query.service.js';
import { DevelopmentMapService } from '../performance/development-map.service.js';
import { PerformanceAssessmentService } from '../performance/performance-assessment.service.js';
import { CheckinService } from '../attendance-realtime/checkin.service.js';
import { EventService } from '../calendar-rsvp/event.service.js';
import { BalanceQueryService } from '../payments-billing/balance-query.service.js';
import type { ConsultarSaldoResultado } from '../payments-billing/balance-query.service.js';
import { AthleteMedicalNoteService } from './athlete-medical-note.service.js';
import { AthleteNutritionNoteService } from './athlete-nutrition-note.service.js';
import { GalleryService } from './gallery.service.js';
import { esStaffElevado, seccionRestringida, seccionVisible } from './player-card.types.js';
import type { SeccionPlayerCard } from './player-card.types.js';
import type { UserRow, UserTenantRoleRow } from '../identity-access/identity-access.types.js';
import type { TeamRow } from '../sports-hub/sports-hub.types.js';
import type { PlayerStatisticRow } from '../match-center/match-center.types.js';
import type { DevelopmentMapRow, PerformanceAssessmentRow } from '../performance/performance.types.js';
import type { CheckinEventRow } from '../attendance-realtime/attendance-realtime.types.js';
import type { EventRow } from '../calendar-rsvp/calendar-rsvp.types.js';
import type { AthleteMedicalNoteRow, AthleteNutritionNoteRow, GalleryAssetRow } from './player-card.types.js';

export interface ConsultarPlayerCardInput {
  organizationId: string;
  actorUserId: string;
  actorRoles: string[];
  athleteUserId: string;
}

export interface PlayerCardResultado {
  administrativo: SeccionPlayerCard<{ user: UserRow; roles: UserTenantRoleRow[] }>;
  deportivo: SeccionPlayerCard<{ teams: (TeamRow | null)[] }>;
  performance: SeccionPlayerCard<{ assessments: PerformanceAssessmentRow[]; matchStatistics: PlayerStatisticRow[]; developmentMap: DevelopmentMapRow | null }>;
  asistencia: SeccionPlayerCard<{ checkins: CheckinEventRow[] }>;
  calendario: SeccionPlayerCard<{ events: EventRow[] }>;
  pagos: SeccionPlayerCard<ConsultarSaldoResultado>;
  medico: SeccionPlayerCard<{ notes: AthleteMedicalNoteRow[] }>;
  nutricion: SeccionPlayerCard<{ notes: AthleteNutritionNoteRow[] }>;
  galeria: SeccionPlayerCard<{ assets: GalleryAssetRow[] }>;
}

// UC-PLC-01 — Consultar Player Card completa. Ensambla datos de 8 dominios ya existentes más las
// 2 tablas propias de notas — nunca lee sus tablas directo, siempre vía los servicios exportados.
@Injectable()
export class PlayerCardQueryService {
  constructor(
    private readonly usersService: UsersService,
    private readonly guardianConsentService: GuardianConsentService,
    private readonly rosterService: RosterService,
    private readonly teamService: TeamService,
    private readonly matchQueryService: MatchQueryService,
    private readonly developmentMapService: DevelopmentMapService,
    private readonly performanceAssessmentService: PerformanceAssessmentService,
    private readonly checkinService: CheckinService,
    private readonly eventService: EventService,
    private readonly balanceQueryService: BalanceQueryService,
    private readonly medicalNoteService: AthleteMedicalNoteService,
    private readonly nutritionNoteService: AthleteNutritionNoteService,
    private readonly galleryService: GalleryService,
  ) {}

  async consultar(input: ConsultarPlayerCardInput): Promise<PlayerCardResultado> {
    const contexto = await this.resolverContexto(input.organizationId, input.actorUserId, input.actorRoles, input.athleteUserId);

    // Secciones administrativa/deportiva/performance/asistencia/calendario/galería: visibles para
    // staff, el propio atleta, su tutor, o el coach de alguno de sus equipos — ninguna de estas
    // aparece en la lista RFP §7 de categorías restringidas (medical/scholarship/waiver/HR/financial).
    const puedeVerGeneral = contexto.esStaff || contexto.esPropio || contexto.esTutor || contexto.esCoachDelEquipo;
    // Médica/nutrición: [propuesto] — "coach/staff con scope médico o nutricional autorizado"
    // (UC-PLC-02) no tiene una entidad que modele esa autorización hoy; se trata de forma
    // conservadora como visible SOLO a staff, el propio atleta o su tutor — nunca a un coach por
    // el solo hecho de serlo (4a: "solo la sección médica muestra restringido").
    const puedeVerSensible = contexto.esStaff || contexto.esPropio || contexto.esTutor;

    const teamIds = await this.rosterService.listarEquiposDeUsuario(input.organizationId, input.athleteUserId);

    const [administrativo, deportivo, performance, asistencia, calendario, pagos, medico, nutricion, galeria] = await Promise.all([
      this.seccionAdministrativa(input.organizationId, input.athleteUserId, puedeVerGeneral),
      this.seccionDeportiva(input.organizationId, teamIds, puedeVerGeneral),
      this.seccionPerformance(input.organizationId, input.athleteUserId, puedeVerGeneral),
      this.seccionAsistencia(input.organizationId, input.athleteUserId, puedeVerGeneral),
      this.seccionCalendario(input.organizationId, teamIds, puedeVerGeneral),
      this.seccionPagos(input, puedeVerGeneral),
      this.seccionMedica(input.organizationId, input.athleteUserId, puedeVerSensible),
      this.seccionNutricion(input.organizationId, input.athleteUserId, puedeVerSensible),
      this.seccionGaleria(input.organizationId, input.athleteUserId, puedeVerGeneral),
    ]);

    return { administrativo, deportivo, performance, asistencia, calendario, pagos, medico, nutricion, galeria };
  }

  private async resolverContexto(organizationId: string, actorUserId: string, actorRoles: string[], athleteUserId: string) {
    const esStaff = esStaffElevado(actorRoles);
    const esPropio = actorUserId === athleteUserId;
    const esTutor = esPropio ? false : await this.guardianConsentService.esGuardianDe(organizationId, actorUserId, athleteUserId);

    let esCoachDelEquipo = false;
    if (!esStaff && !esPropio && !esTutor) {
      const [equiposDelAtleta, equiposDondeEsCoach] = await Promise.all([
        this.rosterService.listarEquiposDeUsuario(organizationId, athleteUserId),
        this.rosterService.listarEquiposDeUsuario(organizationId, actorUserId, { role: 'coach' }),
      ]);
      esCoachDelEquipo = equiposDelAtleta.some((id) => equiposDondeEsCoach.includes(id));
    }

    // 2a: "el solicitante es tutor pero no tiene guardian_link vigente con ese atleta → el sistema
    // deniega el acceso completo a la Player Card, no solo oculta secciones" — generalizado a
    // cualquier solicitante sin NINGUNA relación calificada (ni staff, ni propio, ni tutor, ni
    // coach del equipo): sin acceso alguno a la card, no una sección vacía.
    if (!esStaff && !esPropio && !esTutor && !esCoachDelEquipo) {
      throw new ForbiddenException('No tienes ninguna relación con este atleta que dé acceso a su Player Card.');
    }

    return { esStaff, esPropio, esTutor, esCoachDelEquipo };
  }

  private async seccionAdministrativa(organizationId: string, athleteUserId: string, puedeVer: boolean): Promise<PlayerCardResultado['administrativo']> {
    if (!puedeVer) return seccionRestringida();
    const [user, roles] = await Promise.all([
      this.usersService.obtenerPorId(athleteUserId),
      this.usersService.listarRolesDeUsuario(organizationId, athleteUserId),
    ]);
    return seccionVisible({ user: user as UserRow, roles });
  }

  private async seccionDeportiva(organizationId: string, teamIds: string[], puedeVer: boolean): Promise<PlayerCardResultado['deportivo']> {
    if (!puedeVer) return seccionRestringida();
    const teams = await Promise.all(teamIds.map((id) => this.teamService.obtenerPorId(organizationId, id)));
    return seccionVisible({ teams });
  }

  private async seccionPerformance(organizationId: string, athleteUserId: string, puedeVer: boolean): Promise<PlayerCardResultado['performance']> {
    if (!puedeVer) return seccionRestringida();
    const [assessments, matchStatistics, developmentMap] = await Promise.all([
      this.performanceAssessmentService.listarPorJugador(organizationId, athleteUserId),
      this.matchQueryService.consultarEstadisticasDeJugador(organizationId, athleteUserId),
      this.developmentMapService.obtenerMasRecienteDeAtleta(organizationId, athleteUserId),
    ]);
    return seccionVisible({ assessments, matchStatistics, developmentMap });
  }

  private async seccionAsistencia(organizationId: string, athleteUserId: string, puedeVer: boolean): Promise<PlayerCardResultado['asistencia']> {
    if (!puedeVer) return seccionRestringida();
    const checkins = await this.checkinService.listarPorUsuario(organizationId, athleteUserId);
    return seccionVisible({ checkins });
  }

  private async seccionCalendario(organizationId: string, teamIds: string[], puedeVer: boolean): Promise<PlayerCardResultado['calendario']> {
    if (!puedeVer) return seccionRestringida();
    const events = await this.eventService.listarPorEquipos(organizationId, teamIds);
    return seccionVisible({ events });
  }

  // UC-PLC-04, condensado — delega directo a Payments & Billing, sin duplicar el dato. Si
  // BalanceQueryService rechaza al actor (su propia regla de scope, ver el comentario de brecha
  // conocida en balance-query.service.ts), la sección se marca restringida en vez de romper el
  // resto de la Player Card.
  private async seccionPagos(input: ConsultarPlayerCardInput, puedeVerGeneral: boolean): Promise<PlayerCardResultado['pagos']> {
    if (!puedeVerGeneral) return seccionRestringida();
    try {
      const saldo = await this.balanceQueryService.consultar({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        actorRoles: input.actorRoles,
        athleteUserId: input.athleteUserId,
      });
      return seccionVisible(saldo);
    } catch {
      return seccionRestringida();
    }
  }

  private async seccionMedica(organizationId: string, athleteUserId: string, puedeVer: boolean): Promise<PlayerCardResultado['medico']> {
    if (!puedeVer) return seccionRestringida();
    const notes = await this.medicalNoteService.listarPorJugador(organizationId, athleteUserId);
    return seccionVisible({ notes });
  }

  private async seccionNutricion(organizationId: string, athleteUserId: string, puedeVer: boolean): Promise<PlayerCardResultado['nutricion']> {
    if (!puedeVer) return seccionRestringida();
    const notes = await this.nutritionNoteService.listarPorJugador(organizationId, athleteUserId);
    return seccionVisible({ notes });
  }

  private async seccionGaleria(organizationId: string, athleteUserId: string, puedeVer: boolean): Promise<PlayerCardResultado['galeria']> {
    if (!puedeVer) return seccionRestringida();
    const assets = await this.galleryService.listar(organizationId, 'athlete', athleteUserId);
    return seccionVisible({ assets });
  }
}
