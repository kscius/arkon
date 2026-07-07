import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  EstadoDocumento,
  EstatusAccion,
  EstatusAvance,
  EstatusEstimacion,
  EstatusObservacion,
  Prisma,
  Rol,
  Usuario,
} from '@prisma/client';
import { toCsv } from '../common/csv.util';
import { comparePeriodo } from '../common/periodo.util';
import { ScopeService } from '../common/scope.service';
import { validatePortfolioIdp } from '../metrics/idp-validator';
import { PrismaService } from '../prisma/prisma.service';

export type PendienteTipo =
  | 'avance'
  | 'estimacion'
  | 'documento'
  | 'observacion'
  | 'alerta'
  | 'solicitud'
  | 'idp'
  | 'cierre'
  | 'avance_trimestral'
  | 'recomendacion';

export interface PendienteItem {
  id: string;
  tipo: PendienteTipo;
  titulo: string;
  descripcion: string;
  estatus: string;
  severidad: 'alta' | 'media' | 'baja';
  accion_id: string | null;
  accion_folio: string | null;
  accion_nombre: string | null;
  municipio: string | null;
  fecha: string | null;
  enlace: string;
  /** Verbos accionables in-place según rol (validar, observar, aprobar, etc.). */
  acciones_disponibles?: string[];
}

/**
 * Que estados de cada actividad requieren accion segun el rol del usuario. La bandeja
 * ("acciones pendientes") se construye a partir de esta matriz: cada rol solo ve las
 * actividades sobre las que puede/debe actuar. Las alertas no atendidas se agregan aparte.
 */
const PENDIENTE_MATRIX: Record<
  Rol,
  {
    avance: EstatusAvance[];
    avance_trimestral: EstatusAvance[];
    estimacion: EstatusEstimacion[];
    documento: EstadoDocumento[];
    observacion: EstatusObservacion[];
    solicitud: string[];
    /** Discrepancias IDP: estatal y municipal revisan integridad documental. */
    idp: boolean;
    /** Cierres de ejercicio: solo estatal gestiona el cierre fiscal. */
    cierre: boolean;
    /** Recomendaciones IA: solo estatal aprueba sugerencias del motor. */
    recomendacion: boolean;
  }
> = {
  estatal: {
    avance: [],
    avance_trimestral: [],
    estimacion: [EstatusEstimacion.validada_municipio, EstatusEstimacion.en_revision_estatal],
    documento: [],
    observacion: [EstatusObservacion.abierta],
    solicitud: ['presentada', 'en_revision'],
    idp: true,
    cierre: true,
    recomendacion: true,
  },
  municipal: {
    avance: [EstatusAvance.pendiente, EstatusAvance.en_revision],
    avance_trimestral: [EstatusAvance.pendiente, EstatusAvance.en_revision],
    estimacion: [EstatusEstimacion.presentada, EstatusEstimacion.en_revision_municipal],
    documento: [EstadoDocumento.en_revision],
    observacion: [EstatusObservacion.abierta, EstatusObservacion.en_atencion],
    solicitud: ['presentada', 'en_revision'],
    idp: true,
    cierre: false,
    recomendacion: false,
  },
  contratista: {
    avance: [EstatusAvance.observado],
    avance_trimestral: [EstatusAvance.observado],
    estimacion: [
      EstatusEstimacion.observada_municipio,
      EstatusEstimacion.observada_estado,
      EstatusEstimacion.rechazada,
    ],
    documento: [EstadoDocumento.no_cargado, EstadoDocumento.observado],
    observacion: [EstatusObservacion.abierta, EstatusObservacion.en_atencion],
    solicitud: [],
    idp: false,
    cierre: false,
    recomendacion: false,
  },
};

const CIERRE_ESTADOS_CERRADOS = ['cerrado', 'concluido'];

const SEVERIDAD_ALTA = new Set([
  'observado',
  'observada_municipio',
  'observada_estado',
  'rechazada',
  'no_cargado',
  'abierta',
]);

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  private obraWhere(user: Usuario): Prisma.AccionWhereInput {
    return this.scope.obraWhere(user);
  }

  private alertaWhere(user: Usuario): Prisma.AlertaWhereInput {
    return this.scope.alertaWhere(user);
  }

  async getKpis(user: Usuario) {
    const obraWhere = this.obraWhere(user);
    const obras = await this.prisma.accion.findMany({ where: obraWhere });

    const totalObras = obras.length;
    const obrasEjecucion = obras.filter(
      (o) => o.estatus === EstatusAccion.en_ejecucion_a_tiempo,
    ).length;
    const obrasRetraso = obras.filter((o) => o.estatus === EstatusAccion.en_ejecucion_retraso).length;
    const obrasConcluidas = obras.filter((o) => o.estatus === EstatusAccion.concluida).length;
    const obrasRiesgo = obras.filter((o) => o.estatus === EstatusAccion.en_riesgo).length;
    const montoAutorizado = obras.reduce((s, o) => s + Number(o.montoAutorizado), 0);
    const montoEjercido = obras.reduce((s, o) => s + Number(o.montoEjercido), 0);
    const avanceFisicoPromedio =
      totalObras > 0
        ? obras.reduce((s, o) => s + Number(o.avanceFisicoReal), 0) / totalObras
        : 0;
    const avanceFinancieroPromedio =
      totalObras > 0
        ? obras.reduce((s, o) => s + Number(o.avanceFinanciero), 0) / totalObras
        : 0;

    const alertas = await this.prisma.alerta.findMany({
      where: this.alertaWhere(user),
    });
    const alertasCriticas = alertas.filter((a) => a.severidad === 'critica' && !a.atendida).length;
    const alertasAltas = alertas.filter((a) => a.severidad === 'alta' && !a.atendida).length;
    const alertasTotal = alertas.filter((a) => !a.atendida).length;

    return {
      total_obras: totalObras,
      obras_ejecucion: obrasEjecucion,
      obras_retraso: obrasRetraso,
      obras_concluidas: obrasConcluidas,
      obras_riesgo: obrasRiesgo,
      monto_autorizado: montoAutorizado,
      monto_ejercido: montoEjercido,
      avance_fisico_promedio: Math.round(avanceFisicoPromedio * 100) / 100,
      avance_financiero_promedio: Math.round(avanceFinancieroPromedio * 100) / 100,
      alertas_criticas: alertasCriticas,
      alertas_altas: alertasAltas,
      alertas_total: alertasTotal,
    };
  }

  async obrasPorEstatus(user: Usuario) {
    const rows = await this.prisma.accion.groupBy({
      by: ['estatus'],
      where: this.obraWhere(user),
      _count: { id: true },
    });
    return rows.map((r) => ({ estatus: r.estatus, count: r._count.id }));
  }

  async obrasPorPrograma(user: Usuario) {
    const rows = await this.prisma.accion.groupBy({
      by: ['programa'],
      where: this.obraWhere(user),
      _count: { id: true },
    });
    return rows.map((r) => ({ programa: r.programa, count: r._count.id }));
  }

  async topMunicipios(user: Usuario) {
    if (user.rol === Rol.contratista) {
      throw new ForbiddenException('Not available for contratista role');
    }
    const obras = await this.prisma.accion.findMany({
      where: this.obraWhere(user),
      select: { municipioId: true, programa: true, montoAutorizado: true },
    });

    const byMunicipio = new Map<
      string,
      { programas: Set<string>; obras_count: number; inversion_total: number }
    >();
    for (const obra of obras) {
      const bucket = byMunicipio.get(obra.municipioId) ?? {
        programas: new Set<string>(),
        obras_count: 0,
        inversion_total: 0,
      };
      bucket.programas.add(obra.programa);
      bucket.obras_count += 1;
      bucket.inversion_total += Number(obra.montoAutorizado);
      byMunicipio.set(obra.municipioId, bucket);
    }

    const municipios = await this.prisma.municipio.findMany({
      where: { id: { in: [...byMunicipio.keys()] } },
    });
    const nameById = new Map(municipios.map((m) => [m.id, m.nombre]));

    return [...byMunicipio.entries()]
      .map(([municipioId, stats]) => ({
        municipio: nameById.get(municipioId) ?? '',
        programas_count: stats.programas.size,
        obras_count: stats.obras_count,
        inversion_total: stats.inversion_total,
        _nombre: nameById.get(municipioId) ?? '',
      }))
      .sort((a, b) => {
        if (b.programas_count !== a.programas_count) return b.programas_count - a.programas_count;
        if (b.obras_count !== a.obras_count) return b.obras_count - a.obras_count;
        if (b.inversion_total !== a.inversion_total) return b.inversion_total - a.inversion_total;
        return a._nombre.localeCompare(b._nombre, 'es');
      })
      .slice(0, 10)
      .map(({ _nombre: _n, ...row }) => row);
  }

  async exportSummary(user: Usuario, format: 'csv' | 'json' = 'json'): Promise<string | object> {
    const kpis = await this.getKpis(user);
    const porEstatus = await this.obrasPorEstatus(user);
    const porPrograma = await this.obrasPorPrograma(user);

    const payload = {
      generated_at: new Date().toISOString(),
      kpis,
      obras_por_estatus: porEstatus,
      obras_por_programa: porPrograma,
    };

    if (format === 'json') return payload;

    const kpiRows = Object.entries(kpis).map(([metric, value]) => ({ metric, value }));
    const sections = [
      toCsv(kpiRows, [
        { key: 'metric', header: 'Metrica' },
        { key: 'value', header: 'Valor' },
      ]),
      '',
      '# Acciones por estatus',
      toCsv(
        porEstatus.map((r) => ({ estatus: r.estatus, count: r.count })),
        [
          { key: 'estatus', header: 'Estatus' },
          { key: 'count', header: 'Cantidad' },
        ],
      ),
      '',
      '# Acciones por programa',
      toCsv(
        porPrograma.map((r) => ({ programa: r.programa, count: r.count })),
        [
          { key: 'programa', header: 'Programa' },
          { key: 'count', header: 'Cantidad' },
        ],
      ),
    ];
    return sections.join('\r\n');
  }

  async topContratistas(user: Usuario, programa?: string) {
    if (user.rol === Rol.contratista) {
      throw new ForbiddenException('Not available for contratista role');
    }
    const where: Prisma.AccionWhereInput = {
      ...this.obraWhere(user),
      contratistaId: { not: null },
    };
    if (programa) where.programa = programa;

    const obras = await this.prisma.accion.findMany({
      where,
      include: { contratista: true },
    });

    const byContratista = new Map<
      string,
      {
        contratista_id: string;
        contratista: string;
        programa: string;
        obras_count: number;
        avance_sum: number;
        alertas_activas: number;
      }
    >();

    for (const obra of obras) {
      if (!obra.contratistaId || !obra.contratista) continue;
      const key = `${obra.contratistaId}::${obra.programa}`;
      const bucket = byContratista.get(key) ?? {
        contratista_id: obra.contratistaId,
        contratista: obra.contratista.nombre,
        programa: obra.programa,
        obras_count: 0,
        avance_sum: 0,
        alertas_activas: 0,
      };
      bucket.obras_count += 1;
      bucket.avance_sum += Number(obra.avanceFisicoReal);
      byContratista.set(key, bucket);
    }

    const alertas = await this.prisma.alerta.findMany({
      where: { ...this.alertaWhere(user), atendida: false },
      select: { accionId: true },
    });
    const obrasConAlerta = new Set(alertas.map((a) => a.accionId).filter(Boolean));

    const rows = [...byContratista.values()].map((row) => {
      const contratistaObras = obras.filter((o) => o.contratistaId === row.contratista_id);
      const alertasActivas = contratistaObras.filter((o) => obrasConAlerta.has(o.id)).length;
      const avancePromedio =
        row.obras_count > 0 ? Math.round((row.avance_sum / row.obras_count) * 100) / 100 : 0;
      return {
        contratista_id: row.contratista_id,
        contratista: row.contratista,
        programa: row.programa,
        obras_count: row.obras_count,
        avance_promedio: avancePromedio,
        alertas_activas: alertasActivas,
        ranking_score: avancePromedio - alertasActivas * 5,
      };
    });

    return rows
      .sort((a, b) => b.ranking_score - a.ranking_score)
      .slice(0, 15);
  }

  async avanceTimeline(user: Usuario) {
    const obraWhere = this.obraWhere(user);
    const avances = await this.prisma.avanceMensual.findMany({
      where: { accion: obraWhere },
      select: { periodo: true, programado: true, reportado: true },
    });

    const byPeriodo = new Map<string, { programado: number[]; reportado: number[] }>();
    for (const a of avances) {
      const bucket = byPeriodo.get(a.periodo) ?? { programado: [], reportado: [] };
      bucket.programado.push(Number(a.programado));
      bucket.reportado.push(Number(a.reportado));
      byPeriodo.set(a.periodo, bucket);
    }

    const avg = (vals: number[]) =>
      vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;

    return [...byPeriodo.entries()]
      .sort(([a], [b]) => comparePeriodo(a, b))
      .map(([periodo, vals]) => ({
        mes: periodo,
        programado: Math.round(avg(vals.programado) * 10) / 10,
        real: Math.round(avg(vals.reportado) * 10) / 10,
      }));
  }

  /**
   * Bandeja de acciones pendientes: agrega las actividades (avances, estimaciones,
   * documentos, observaciones, alertas y solicitudes) que requieren accion del usuario
   * segun su rol, ya filtradas por su alcance. El foco es "que hay que hacer", no el
   * inventario total de acciones.
   */
  async getPendientes(user: Usuario) {
    const cfg = PENDIENTE_MATRIX[user.rol];
    const accionWhere = this.scope.obraWhere(user);
    const accionSelect = {
      id: true,
      folio: true,
      nombre: true,
      municipio: { select: { nombre: true } },
    } as const;
    const ITEM_LIMIT = 50;

    const items: PendienteItem[] = [];
    const totales = {
      avances: 0,
      estimaciones: 0,
      documentos: 0,
      observaciones: 0,
      alertas: 0,
      solicitudes: 0,
      idp: 0,
      cierres: 0,
      avances_trimestrales: 0,
      recomendaciones: 0,
    };

    if (cfg.avance.length) {
      const where: Prisma.AvanceMensualWhereInput = {
        estatus: { in: cfg.avance },
        accion: accionWhere,
      };
      totales.avances = await this.prisma.avanceMensual.count({ where });
      const rows = await this.prisma.avanceMensual.findMany({
        where,
        take: ITEM_LIMIT,
        orderBy: { createdAt: 'desc' },
        include: { accion: { select: accionSelect } },
      });
      for (const r of rows) {
        const titulo =
          r.estatus === EstatusAvance.observado
            ? 'Avance observado por corregir'
            : 'Avance por validar';
        items.push(
          this.buildPendiente(
            'avance',
            r.id,
            titulo,
            `Periodo ${r.periodo}`,
            r.estatus,
            r.accion,
            'avance',
            r.createdAt,
            user.rol,
          ),
        );
      }
    }

    if (cfg.avance_trimestral.length) {
      const where: Prisma.AvanceTrimestralWhereInput = {
        estatus: { in: cfg.avance_trimestral },
        accion: accionWhere,
      };
      totales.avances_trimestrales = await this.prisma.avanceTrimestral.count({ where });
      const rows = await this.prisma.avanceTrimestral.findMany({
        where,
        take: ITEM_LIMIT,
        orderBy: { createdAt: 'desc' },
        include: { accion: { select: accionSelect } },
      });
      for (const r of rows) {
        const titulo =
          r.estatus === EstatusAvance.observado
            ? 'Avance trimestral observado por corregir'
            : 'Avance trimestral por validar';
        items.push(
          this.buildPendiente(
            'avance_trimestral',
            r.id,
            titulo,
            `T${r.trimestre} · Ejercicio ${r.ejercicioFiscal}`,
            r.estatus,
            r.accion,
            'proagua',
            r.createdAt,
            user.rol,
          ),
        );
      }
    }

    if (cfg.estimacion.length) {
      const where: Prisma.EstimacionWhereInput = {
        estatus: { in: cfg.estimacion },
        accion: accionWhere,
      };
      totales.estimaciones = await this.prisma.estimacion.count({ where });
      const rows = await this.prisma.estimacion.findMany({
        where,
        take: ITEM_LIMIT,
        orderBy: { createdAt: 'desc' },
        include: { accion: { select: accionSelect } },
      });
      for (const r of rows) {
        items.push(
          this.buildPendiente(
            'estimacion',
            r.id,
            this.estimacionTitulo(r.estatus),
            `Estimación #${r.numero} · ${r.periodo}`,
            r.estatus,
            r.accion,
            'estimaciones',
            r.createdAt,
            user.rol,
          ),
        );
      }
    }

    if (cfg.documento.length) {
      const where: Prisma.DocumentoWhereInput = {
        estatus: { in: cfg.documento },
        accion: accionWhere,
      };
      totales.documentos = await this.prisma.documento.count({ where });
      const rows = await this.prisma.documento.findMany({
        where,
        take: ITEM_LIMIT,
        orderBy: { createdAt: 'desc' },
        include: { accion: { select: accionSelect } },
      });
      for (const r of rows) {
        const titulo =
          r.estatus === EstadoDocumento.no_cargado
            ? 'Documento por cargar'
            : r.estatus === EstadoDocumento.observado
              ? 'Documento observado'
              : 'Documento por revisar';
        items.push(
          this.buildPendiente('documento', r.id, titulo, r.nombre, r.estatus, r.accion, 'expediente', r.createdAt, user.rol),
        );
      }
    }

    if (cfg.observacion.length) {
      const where: Prisma.ObservacionWhereInput = {
        estatus: { in: cfg.observacion },
        accion: accionWhere,
      };
      totales.observaciones = await this.prisma.observacion.count({ where });
      const rows = await this.prisma.observacion.findMany({
        where,
        take: ITEM_LIMIT,
        orderBy: { createdAt: 'desc' },
        include: { accion: { select: accionSelect } },
      });
      for (const r of rows) {
        const titulo =
          r.estatus === EstatusObservacion.en_atencion
            ? 'Observación en atención'
            : 'Observación por atender';
        items.push(
          this.buildPendiente('observacion', r.id, titulo, r.descripcion, r.estatus, r.accion, 'observaciones', r.createdAt, user.rol),
        );
      }
    }

    // Alertas no atendidas (todos los roles, ya filtradas por alcance).
    {
      const where: Prisma.AlertaWhereInput = {
        ...this.scope.alertaWhere(user),
        atendida: false,
      };
      totales.alertas = await this.prisma.alerta.count({ where });
      const rows = await this.prisma.alerta.findMany({
        where,
        take: ITEM_LIMIT,
        orderBy: { createdAt: 'desc' },
        include: { accion: { select: accionSelect } },
      });
      for (const r of rows) {
        const severidad: PendienteItem['severidad'] =
          r.severidad === 'critica' || r.severidad === 'alta'
            ? 'alta'
            : r.severidad === 'baja'
              ? 'baja'
              : 'media';
        items.push({
          id: r.id,
          tipo: 'alerta',
          titulo: r.titulo,
          descripcion: r.descripcion,
          estatus: r.severidad,
          severidad,
          accion_id: r.accion?.id ?? null,
          accion_folio: r.accion?.folio ?? null,
          accion_nombre: r.accion?.nombre ?? null,
          municipio: r.accion?.municipio?.nombre ?? r.municipio ?? null,
          fecha: r.fechaGeneracion ?? r.createdAt.toISOString(),
          enlace: '/alertas',
          acciones_disponibles: this.accionesDisponibles('alerta', user.rol),
        });
      }
    }

    if (cfg.solicitud.length) {
      const where: Prisma.SolicitudProgramaWhereInput = {
        estatus: { in: cfg.solicitud },
        ...this.solicitudScope(user),
      };
      totales.solicitudes = await this.prisma.solicitudPrograma.count({ where });
      const rows = await this.prisma.solicitudPrograma.findMany({
        where,
        take: ITEM_LIMIT,
        orderBy: { createdAt: 'desc' },
        include: { municipio: { select: { nombre: true } } },
      });
      for (const r of rows) {
        items.push({
          id: r.id,
          tipo: 'solicitud',
          titulo: `Solicitud ${r.programa} por revisar`,
          descripcion: `${r.componente} · ${r.tipoApoyo} (${r.ejercicioFiscal})`,
          estatus: r.estatus,
          severidad: 'media',
          accion_id: null,
          accion_folio: null,
          accion_nombre: null,
          municipio: r.municipio?.nombre ?? null,
          fecha: r.createdAt.toISOString(),
          enlace: '/solicitudes',
          acciones_disponibles: this.accionesDisponibles('solicitud', user.rol),
        });
      }
    }

    if (cfg.idp) {
      const acciones = await this.prisma.accion.findMany({
        where: accionWhere,
        select: {
          id: true,
          folio: true,
          nombre: true,
          montoContratado: true,
          montoAutorizado: true,
          createdAt: true,
          municipio: { select: { nombre: true } },
          documentos: { select: { categoria: true, estatus: true, fechaCarga: true, nombre: true } },
          estimaciones: { select: { montoEstimado: true, estatus: true } },
        },
      });
      const idpReport = validatePortfolioIdp(
        acciones.map((a) => ({
          accion: a,
          documentos: a.documentos,
          estimaciones: a.estimaciones,
        })),
      );
      const conDiscrepancias = idpReport.acciones.filter((r) => r.discrepancias.length > 0);
      totales.idp = conDiscrepancias.length;
      const accionById = new Map(acciones.map((a) => [a.id, a]));
      for (const report of conDiscrepancias.slice(0, ITEM_LIMIT)) {
        const accion = accionById.get(report.accion_id);
        const tieneAlta = report.discrepancias.some((d) => d.severidad === 'alta');
        const tieneMedia = report.discrepancias.some((d) => d.severidad === 'media');
        const severidad: PendienteItem['severidad'] = tieneAlta ? 'alta' : tieneMedia ? 'media' : 'baja';
        items.push({
          id: report.accion_id,
          tipo: 'idp',
          titulo: 'Discrepancias IDP detectadas',
          descripcion: `${report.discrepancias.length} discrepancia(s) · completitud ${report.completitud_pct}%`,
          estatus: severidad,
          severidad,
          accion_id: report.accion_id,
          accion_folio: report.folio,
          accion_nombre: report.nombre,
          municipio: accion?.municipio?.nombre ?? null,
          fecha: accion?.createdAt.toISOString() ?? null,
          enlace: `/acciones/${report.accion_id}?tab=expediente`,
          acciones_disponibles: this.accionesDisponibles('idp', user.rol),
        });
      }
    }

    if (cfg.cierre) {
      const where: Prisma.CierreEjercicioWhereInput = {
        estatus: { notIn: CIERRE_ESTADOS_CERRADOS },
      };
      totales.cierres = await this.prisma.cierreEjercicio.count({ where });
      const rows = await this.prisma.cierreEjercicio.findMany({
        where,
        take: ITEM_LIMIT,
        orderBy: [{ ejercicioFiscal: 'desc' }, { createdAt: 'desc' }],
        include: { anexoEjecucion: { select: { numero: true } } },
      });
      const ejercicioActual = new Date().getFullYear();
      for (const r of rows) {
        const vencido = r.ejercicioFiscal < ejercicioActual;
        items.push({
          id: r.id,
          tipo: 'cierre',
          titulo: 'Cierre de ejercicio pendiente',
          descripcion: `${r.tipoApoyo} · Ejercicio ${r.ejercicioFiscal}${r.anexoEjecucion ? ` · Anexo ${r.anexoEjecucion.numero}` : ''}`,
          estatus: r.estatus,
          severidad: vencido ? 'alta' : 'media',
          accion_id: null,
          accion_folio: null,
          accion_nombre: null,
          municipio: null,
          fecha: r.createdAt.toISOString(),
          enlace: '/cierres-ejercicio',
          acciones_disponibles: this.accionesDisponibles('cierre', user.rol),
        });
      }
    }

    if (cfg.recomendacion) {
      const where: Prisma.RecomendacionWhereInput = {
        estatus: 'pendiente',
        accion: accionWhere,
      };
      totales.recomendaciones = await this.prisma.recomendacion.count({ where });
      const rows = await this.prisma.recomendacion.findMany({
        where,
        take: ITEM_LIMIT,
        orderBy: [{ prioridad: 'asc' }, { createdAt: 'desc' }],
        include: { accion: { select: accionSelect } },
      });
      for (const r of rows) {
        const severidad: PendienteItem['severidad'] =
          r.prioridad === 'alta' ? 'alta' : r.prioridad === 'baja' ? 'baja' : 'media';
        items.push({
          id: r.id,
          tipo: 'recomendacion',
          titulo: r.titulo,
          descripcion: r.descripcion,
          estatus: r.estatus,
          severidad,
          accion_id: r.accion?.id ?? null,
          accion_folio: r.accion?.folio ?? null,
          accion_nombre: r.accion?.nombre ?? null,
          municipio: r.accion?.municipio?.nombre ?? null,
          fecha: r.createdAt.toISOString(),
          enlace: '/bandeja',
          acciones_disponibles: this.accionesDisponibles('recomendacion', user.rol),
        });
      }
    }

    const severidadRank = { alta: 0, media: 1, baja: 2 } as const;
    items.sort((a, b) => {
      if (severidadRank[a.severidad] !== severidadRank[b.severidad]) {
        return severidadRank[a.severidad] - severidadRank[b.severidad];
      }
      return (b.fecha ?? '').localeCompare(a.fecha ?? '');
    });

    const total =
      totales.avances +
      totales.estimaciones +
      totales.documentos +
      totales.observaciones +
      totales.alertas +
      totales.solicitudes +
      totales.idp +
      totales.cierres +
      totales.avances_trimestrales +
      totales.recomendaciones;

    return { total, totales, items };
  }

  private solicitudScope(user: Usuario): Prisma.SolicitudProgramaWhereInput {
    if (user.rol === Rol.estatal) return {};
    if (user.rol === Rol.municipal && user.municipioId) {
      return { municipioId: user.municipioId };
    }
    return { id: '00000000-0000-0000-0000-000000000000' };
  }

  private estimacionTitulo(estatus: EstatusEstimacion): string {
    if (
      estatus === EstatusEstimacion.observada_municipio ||
      estatus === EstatusEstimacion.observada_estado ||
      estatus === EstatusEstimacion.rechazada
    ) {
      return 'Estimación observada por corregir';
    }
    if (
      estatus === EstatusEstimacion.validada_municipio ||
      estatus === EstatusEstimacion.en_revision_estatal
    ) {
      return 'Estimación por autorizar (estatal)';
    }
    return 'Estimación por validar (municipal)';
  }

  /**
   * Verbos in-place por tipo y rol (PENDIENTE_MATRIX define visibilidad).
   * avance/trimestral municipal: validar|observar; estimacion estatal: autorizar|observar;
   * estimacion municipal: validar|observar; documento municipal: validar|observar;
   * observacion: atender|cerrar; alerta: atender; solicitud: aprobar|rechazar;
   * recomendacion estatal: aprobar; idp estatal/municipal: revisar; cierre: sin acciones in-place.
   */
  private accionesDisponibles(tipo: PendienteTipo, rol: Rol): string[] {
    switch (tipo) {
      case 'avance':
      case 'avance_trimestral':
        return rol === Rol.municipal ? ['validar', 'observar'] : [];
      case 'estimacion':
        if (rol === Rol.estatal) return ['autorizar', 'observar'];
        if (rol === Rol.municipal) return ['validar', 'observar'];
        return [];
      case 'documento':
        return rol === Rol.municipal ? ['validar', 'observar'] : [];
      case 'observacion':
        if (rol === Rol.estatal || rol === Rol.municipal) return ['atender', 'cerrar'];
        if (rol === Rol.contratista) return ['atender'];
        return [];
      case 'alerta':
        return ['atender'];
      case 'solicitud':
        return rol === Rol.estatal || rol === Rol.municipal ? ['aprobar', 'rechazar'] : [];
      case 'recomendacion':
        return rol === Rol.estatal ? ['aprobar'] : [];
      case 'idp':
        return rol === Rol.estatal || rol === Rol.municipal ? ['revisar'] : [];
      case 'cierre':
        return [];
      default:
        return [];
    }
  }

  private buildPendiente(
    tipo: PendienteTipo,
    id: string,
    titulo: string,
    descripcion: string,
    estatus: string,
    accion: { id: string; folio: string; nombre: string; municipio: { nombre: string } | null } | null,
    tab: string,
    fecha: Date,
    rol: Rol,
  ): PendienteItem {
    const acciones = this.accionesDisponibles(tipo, rol);
    return {
      id,
      tipo,
      titulo,
      descripcion,
      estatus,
      severidad: SEVERIDAD_ALTA.has(estatus) ? 'alta' : 'media',
      accion_id: accion?.id ?? null,
      accion_folio: accion?.folio ?? null,
      accion_nombre: accion?.nombre ?? null,
      municipio: accion?.municipio?.nombre ?? null,
      fecha: fecha.toISOString(),
      enlace: accion?.id ? `/acciones/${accion.id}?tab=${tab}` : '/acciones',
      ...(acciones.length > 0 ? { acciones_disponibles: acciones } : {}),
    };
  }
}
