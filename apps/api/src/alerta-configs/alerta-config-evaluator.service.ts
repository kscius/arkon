import { Injectable, Logger } from '@nestjs/common';
import { AlertaConfig, EstatusObra, EstadoDocumento, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const REQUIRED_DOC_CATEGORIES = ['administrativa', 'tecnica', 'ejecucion'] as const;
const ACTIVE_OBRA_STATUSES: EstatusObra[] = [
  EstatusObra.en_ejecucion_a_tiempo,
  EstatusObra.en_ejecucion_retraso,
  EstatusObra.en_riesgo,
];

export interface AlertaMatch {
  obraId: string;
  folio: string;
  nombre: string;
  municipio: string;
  municipioId: string;
  titulo: string;
  descripcion: string;
}

type ObraWithRelations = Prisma.ObraGetPayload<{
  include: {
    municipio: true;
    avances: true;
    estimaciones: true;
    documentos: true;
  };
}>;

@Injectable()
export class AlertaConfigEvaluatorService {
  private readonly logger = new Logger(AlertaConfigEvaluatorService.name);

  constructor(private readonly prisma: PrismaService) {}

  buildObraWhere(config: AlertaConfig): Prisma.ObraWhereInput {
    const where: Prisma.ObraWhereInput = {};
    if (config.obraId) {
      where.id = config.obraId;
    } else {
      if (config.municipioId) where.municipioId = config.municipioId;
      if (config.programaFiltro) where.programa = config.programaFiltro;
    }
    return where;
  }

  async findMatchingObras(config: AlertaConfig): Promise<ObraWithRelations[]> {
    return this.prisma.obra.findMany({
      where: this.buildObraWhere(config),
      include: {
        municipio: true,
        avances: { orderBy: { updatedAt: 'desc' } },
        estimaciones: { orderBy: { updatedAt: 'desc' } },
        documentos: true,
      },
    });
  }

  evaluateObra(config: AlertaConfig, obra: ObraWithRelations): AlertaMatch | null {
    switch (config.tipo) {
      case 'sin_actualizaciones':
        return this.evalSinActualizaciones(config, obra);
      case 'exceso_presupuesto':
        return this.evalExcesoPresupuesto(config, obra);
      case 'retraso_fisico':
        return this.evalRetrasoFisico(config, obra);
      case 'sin_estimaciones':
        return this.evalSinEstimaciones(config, obra);
      case 'documentacion_incompleta':
        return this.evalDocumentacionIncompleta(config, obra);
      default:
        return null;
    }
  }

  async evaluateConfig(config: AlertaConfig): Promise<AlertaMatch[]> {
    const obras = await this.findMatchingObras(config);
    const matches: AlertaMatch[] = [];
    for (const obra of obras) {
      const match = this.evaluateObra(config, obra);
      if (match) matches.push(match);
    }
    return matches;
  }

  buildWhatsAppMessage(config: AlertaConfig, match: AlertaMatch): string {
    return `[ARKON Demo] Alerta "${config.nombre}" (${config.severidad}): ${match.titulo}. ${match.descripcion}`;
  }

  logSimulatedDispatch(
    config: AlertaConfig,
    matches: AlertaMatch[],
    destinatarios: Array<{ nombre: string; telefono: string }>,
  ): void {
    for (const dest of destinatarios) {
      for (const match of matches) {
        const msg = this.buildWhatsAppMessage(config, match);
        this.logger.log(
          `[WhatsApp SIMULADO] -> ${dest.nombre} (${dest.telefono}): ${msg}`,
        );
      }
    }
  }

  private daysSince(date: Date): number {
    const ms = Date.now() - date.getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }

  private lastActivityDate(obra: ObraWithRelations): Date {
    const dates = [obra.updatedAt, ...obra.avances.map((a) => a.updatedAt)];
    return dates.reduce((latest, d) => (d > latest ? d : latest), obra.updatedAt);
  }

  private evalSinActualizaciones(
    config: AlertaConfig,
    obra: ObraWithRelations,
  ): AlertaMatch | null {
    if (!ACTIVE_OBRA_STATUSES.includes(obra.estatus)) return null;
    const umbral = config.umbralDias ?? 30;
    const days = this.daysSince(this.lastActivityDate(obra));
    if (days < umbral) return null;
    return {
      obraId: obra.id,
      folio: obra.folio,
      nombre: obra.nombre,
      municipio: obra.municipio.nombre,
      municipioId: obra.municipioId,
      titulo: `Sin actualizaciones: ${obra.folio}`,
      descripcion: `La obra lleva ${days} dias sin actualizaciones (umbral: ${umbral} dias).`,
    };
  }

  private evalExcesoPresupuesto(
    config: AlertaConfig,
    obra: ObraWithRelations,
  ): AlertaMatch | null {
    if (!ACTIVE_OBRA_STATUSES.includes(obra.estatus)) return null;
    const ejercido = Number(obra.montoEjercido);
    const autorizado = Number(obra.montoAutorizado);
    const pctUmbral = config.umbralPorcentaje != null ? Number(config.umbralPorcentaje) : 100;
    const montoUmbral = config.umbralMonto != null ? Number(config.umbralMonto) : null;

    let triggered = false;
    let reason = '';

    if (autorizado > 0) {
      const pct = (ejercido / autorizado) * 100;
      if (pct >= pctUmbral) {
        triggered = true;
        reason = `Monto ejercido ($${ejercido.toLocaleString('es-MX')}) representa ${pct.toFixed(1)}% del autorizado (umbral ${pctUmbral}%).`;
      }
    }
    if (!triggered && montoUmbral != null && ejercido >= montoUmbral) {
      triggered = true;
      reason = `Monto ejercido ($${ejercido.toLocaleString('es-MX')}) supera umbral de $${montoUmbral.toLocaleString('es-MX')}.`;
    }
    if (!triggered) return null;

    return {
      obraId: obra.id,
      folio: obra.folio,
      nombre: obra.nombre,
      municipio: obra.municipio.nombre,
      municipioId: obra.municipioId,
      titulo: `Exceso presupuesto: ${obra.folio}`,
      descripcion: reason,
    };
  }

  private evalRetrasoFisico(
    config: AlertaConfig,
    obra: ObraWithRelations,
  ): AlertaMatch | null {
    if (!ACTIVE_OBRA_STATUSES.includes(obra.estatus)) return null;
    const real = Number(obra.avanceFisicoReal);
    const programado = Number(obra.avanceFisicoProgramado);
    const lag = programado - real;
    const umbral = config.umbralPorcentaje != null ? Number(config.umbralPorcentaje) : 10;
    if (lag < umbral) return null;
    return {
      obraId: obra.id,
      folio: obra.folio,
      nombre: obra.nombre,
      municipio: obra.municipio.nombre,
      municipioId: obra.municipioId,
      titulo: `Retraso fisico: ${obra.folio}`,
      descripcion: `Avance real ${real}% vs programado ${programado}% (desfase ${lag.toFixed(1)} puntos, umbral ${umbral}).`,
    };
  }

  private evalSinEstimaciones(
    config: AlertaConfig,
    obra: ObraWithRelations,
  ): AlertaMatch | null {
    if (!ACTIVE_OBRA_STATUSES.includes(obra.estatus)) return null;
    const umbral = config.umbralDias ?? 60;

    if (obra.estimaciones.length === 0) {
      return {
        obraId: obra.id,
        folio: obra.folio,
        nombre: obra.nombre,
        municipio: obra.municipio.nombre,
        municipioId: obra.municipioId,
        titulo: `Sin estimaciones: ${obra.folio}`,
        descripcion: 'La obra no tiene estimaciones registradas.',
      };
    }

    const latest = obra.estimaciones[0];
    const days = this.daysSince(latest.updatedAt);
    if (days < umbral) return null;

    return {
      obraId: obra.id,
      folio: obra.folio,
      nombre: obra.nombre,
      municipio: obra.municipio.nombre,
      municipioId: obra.municipioId,
      titulo: `Estimaciones desactualizadas: ${obra.folio}`,
      descripcion: `Ultima estimacion hace ${days} dias (umbral: ${umbral} dias).`,
    };
  }

  private evalDocumentacionIncompleta(
    config: AlertaConfig,
    obra: ObraWithRelations,
  ): AlertaMatch | null {
    const excluded: EstatusObra[] = [
      EstatusObra.concluida,
      EstatusObra.cancelada,
      EstatusObra.cerrada,
    ];
    if (excluded.includes(obra.estatus)) return null;
    const missing = REQUIRED_DOC_CATEGORIES.filter((cat) => {
      const docs = obra.documentos.filter((d) => d.categoria === cat);
      if (docs.length === 0) return true;
      return docs.every(
        (d) => d.estatus === EstadoDocumento.no_cargado || !d.archivo,
      );
    });
    if (missing.length === 0) return null;
    return {
      obraId: obra.id,
      folio: obra.folio,
      nombre: obra.nombre,
      municipio: obra.municipio.nombre,
      municipioId: obra.municipioId,
      titulo: `Documentacion incompleta: ${obra.folio}`,
      descripcion: `Faltan documentos en categorias: ${missing.join(', ')}.`,
    };
  }
}
