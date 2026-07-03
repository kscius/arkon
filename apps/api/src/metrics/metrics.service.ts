import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma, Usuario } from '@prisma/client';
import { ScopeService } from '../common/scope.service';
import { accionHasGeo } from '../common/geo';
import { PrismaService } from '../prisma/prisma.service';
import {
  calculateEvm,
  calculateMirFromAcciones,
  calculateRisk,
  contractorScore,
  dataQuality,
  detectAnomalies,
  gapIndex,
  marginacionOrdinal,
  predictDelayAndCost,
  proaguaComplianceCalendar,
} from './metrics-calculator';
import { validateAccionIdp, validatePortfolioIdp } from './idp-validator';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  private obraWhere(user: Usuario): Prisma.AccionWhereInput {
    return this.scope.obraWhere(user);
  }

  async recomputeAll(user?: Usuario): Promise<{ processed: number }> {
    const where = user ? this.obraWhere(user) : {};
    const acciones = await this.prisma.accion.findMany({
      where,
      include: {
        avances: { orderBy: { periodo: 'asc' } },
        estimaciones: true,
        documentos: true,
        alertas: { where: { atendida: false } },
      },
    });

    for (const accion of acciones) {
      await this.recomputeAccion(accion);
    }

    await this.syncActivosFromAcciones(where);
    await this.generateRecommendations(where);
    await this.deduplicateRecommendations(where);
    return { processed: acciones.length };
  }

  private dedupeRecommendationsList<
    T extends { accionId: string | null; tipo: string; id: string },
  >(rows: T[]): T[] {
    const seen = new Set<string>();
    return rows.filter((r) => {
      const key = `${r.accionId ?? 'global'}:${r.tipo}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private async deduplicateRecommendations(where: Prisma.AccionWhereInput) {
    const pending = await this.prisma.recomendacion.findMany({
      where: { estatus: 'pendiente', accion: where },
      orderBy: { createdAt: 'desc' },
    });
    const seen = new Set<string>();
    const toDelete: string[] = [];
    for (const r of pending) {
      const key = `${r.accionId ?? 'global'}:${r.tipo}`;
      if (seen.has(key)) toDelete.push(r.id);
      else seen.add(key);
    }
    if (toDelete.length > 0) {
      await this.prisma.recomendacion.deleteMany({ where: { id: { in: toDelete } } });
      this.logger.log(`Removed ${toDelete.length} duplicate recommendations`);
    }
  }

  private async recomputeAccion(
    accion: Prisma.AccionGetPayload<{
      include: {
        avances: true;
        estimaciones: true;
        documentos: true;
        alertas: true;
      };
    }>,
  ) {
    const diasSinActualizacion = Math.min(
      999,
      Math.floor(
        (Date.now() - accion.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
      ),
    );
    const risk = calculateRisk(accion, accion.alertas.length, diasSinActualizacion);
    const evm = calculateEvm(accion, accion.avances);
    const anomaly = detectAnomalies(accion, accion.estimaciones);
    const prediction = predictDelayAndCost(accion, risk.score, evm);
    const salud =
      100 -
      risk.score * 0.4 -
      anomaly.score * 0.3 -
      (prediction.prob_retraso + prediction.prob_sobrecosto) * 50 * 0.3;

    await this.prisma.accionScore.upsert({
      where: { accionId: accion.id },
      create: {
        accionId: accion.id,
        riesgoScore: risk.score,
        riesgoNivel: risk.nivel,
        riesgoFactores: risk.factores as unknown as Prisma.InputJsonValue,
        spi: evm.spi,
        cpi: evm.cpi,
        eac: evm.eac,
        etc: evm.etc,
        vac: evm.vac,
        tcpi: evm.tcpi,
        pv: evm.pv,
        ev: evm.ev,
        ac: evm.ac,
        bac: evm.bac,
        probRetraso: prediction.prob_retraso,
        probSobrecosto: prediction.prob_sobrecosto,
        anomaliaScore: anomaly.score,
        saludScore: Math.max(0, Math.min(100, Math.round(salud * 100) / 100)),
      },
      update: {
        riesgoScore: risk.score,
        riesgoNivel: risk.nivel,
        riesgoFactores: risk.factores as unknown as Prisma.InputJsonValue,
        spi: evm.spi,
        cpi: evm.cpi,
        eac: evm.eac,
        etc: evm.etc,
        vac: evm.vac,
        tcpi: evm.tcpi,
        pv: evm.pv,
        ev: evm.ev,
        ac: evm.ac,
        bac: evm.bac,
        probRetraso: prediction.prob_retraso,
        probSobrecosto: prediction.prob_sobrecosto,
        anomaliaScore: anomaly.score,
        saludScore: Math.max(0, Math.min(100, Math.round(salud * 100) / 100)),
        computedAt: new Date(),
      },
    });

    for (const point of evm.curva_s) {
      await this.prisma.metricSnapshot.deleteMany({
        where: {
          accionId: accion.id,
          metricKey: { in: ['curva_s_pv', 'curva_s_ev'] },
          periodo: point.periodo,
        },
      });
      await this.prisma.metricSnapshot.create({
        data: {
          accionId: accion.id,
          metricKey: 'curva_s_pv',
          periodo: point.periodo,
          valor: point.pv,
        },
      });
      await this.prisma.metricSnapshot.create({
        data: {
          accionId: accion.id,
          metricKey: 'curva_s_ev',
          periodo: point.periodo,
          valor: point.ev,
        },
      });
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async nightlyRecompute(): Promise<void> {
    this.logger.log('Nightly metrics recompute started');
    const result = await this.recomputeAll();
    this.logger.log(`Nightly metrics recompute done: ${result.processed} acciones`);
  }

  async getDataQuality(user: Usuario) {
    const where = this.obraWhere(user);
    const acciones = await this.prisma.accion.findMany({
      where,
      select: {
        id: true,
        latitud: true,
        longitud: true,
        contratistaId: true,
        cua: true,
        obraFisica: { select: { latitud: true, longitud: true } },
        _count: { select: { avances: true, documentos: true } },
      },
    });
    const total = acciones.length;
    const conGeo = acciones.filter((a) => accionHasGeo(a)).length;
    const conContratista = acciones.filter((a) => a.contratistaId).length;
    const conAvances = acciones.filter((a) => a._count.avances > 0).length;
    const conDocumentos = acciones.filter((a) => a._count.documentos > 0).length;
    const conCua = acciones.filter((a) => a.cua).length;
    return dataQuality(total, conGeo, conContratista, conAvances, conDocumentos, conCua);
  }

  async getRiskScores(user: Usuario) {
    const acciones = await this.prisma.accion.findMany({
      where: this.obraWhere(user),
      include: {
        score: true,
        municipio: { select: { nombre: true } },
      },
    });
    return acciones
      .filter((a) => a.score)
      .map((a) => ({
        accion_id: a.id,
        folio: a.folio,
        nombre: a.nombre,
        municipio: a.municipio.nombre,
        riesgo_score: Number(a.score!.riesgoScore),
        riesgo_nivel: a.score!.riesgoNivel,
        factores: a.score!.riesgoFactores,
        prob_retraso: a.score!.probRetraso ? Number(a.score!.probRetraso) : null,
        prob_sobrecosto: a.score!.probSobrecosto ? Number(a.score!.probSobrecosto) : null,
        anomalia_score: a.score!.anomaliaScore ? Number(a.score!.anomaliaScore) : null,
        salud_score: a.score!.saludScore ? Number(a.score!.saludScore) : null,
      }))
      .sort((a, b) => b.riesgo_score - a.riesgo_score);
  }

  async getRiskByAccion(accionId: string, user: Usuario) {
    await this.scope.getObraOrThrow(accionId, user);
    const score = await this.prisma.accionScore.findUnique({ where: { accionId } });
    if (!score) {
      await this.recomputeAll(user);
      return this.prisma.accionScore.findUnique({ where: { accionId } });
    }
    return score;
  }

  async getEvmPortfolio(user: Usuario) {
    const scores = await this.prisma.accionScore.findMany({
      where: { accion: this.obraWhere(user) },
      include: { accion: { select: { folio: true, nombre: true } } },
    });
    const avg = (vals: (number | null)[]) => {
      const valid = vals.filter((v): v is number => v !== null);
      return valid.length ? valid.reduce((s, v) => s + v, 0) / valid.length : null;
    };
    return {
      acciones: scores.map((s) => ({
        accion_id: s.accionId,
        folio: s.accion.folio,
        nombre: s.accion.nombre,
        spi: s.spi ? Number(s.spi) : null,
        cpi: s.cpi ? Number(s.cpi) : null,
        eac: s.eac ? Number(s.eac) : null,
        vac: s.vac ? Number(s.vac) : null,
        tcpi: s.tcpi ? Number(s.tcpi) : null,
      })),
      promedio_spi: avg(scores.map((s) => (s.spi ? Number(s.spi) : null))),
      promedio_cpi: avg(scores.map((s) => (s.cpi ? Number(s.cpi) : null))),
    };
  }

  async getEvmByAccion(accionId: string, user: Usuario) {
    const accion = await this.scope.getObraOrThrow(accionId, user);
    const avances = await this.prisma.avanceMensual.findMany({
      where: { accionId },
      orderBy: { periodo: 'asc' },
    });
    const evm = calculateEvm(accion, avances);
    const score = await this.prisma.accionScore.findUnique({ where: { accionId } });
    return { ...evm, score: score ?? null };
  }

  async getGeoAggregates(user: Usuario) {
    const obras = await this.prisma.accion.findMany({
      where: this.obraWhere(user),
      include: {
        municipio: true,
        score: true,
      },
    });
    const byMun = new Map<
      string,
      {
        municipio_id: string;
        municipio: string;
        latitud: number | null;
        longitud: number | null;
        es_zap: boolean;
        marginacion: string | null;
        poblacion: number;
        obras_count: number;
        inversion_total: number;
        avance_promedio: number;
        retraso_count: number;
        riesgo_promedio: number;
        gap_index: number;
      }
    >();

    for (const obra of obras) {
      const m = obra.municipio;
      const bucket = byMun.get(m.id) ?? {
        municipio_id: m.id,
        municipio: m.nombre,
        latitud: m.latitud ? Number(m.latitud) : null,
        longitud: m.longitud ? Number(m.longitud) : null,
        es_zap: m.esZap,
        marginacion: m.marginacion,
        poblacion: m.poblacion ?? 0,
        obras_count: 0,
        inversion_total: 0,
        avance_promedio: 0,
        retraso_count: 0,
        riesgo_promedio: 0,
        gap_index: 0,
      };
      bucket.obras_count += 1;
      bucket.inversion_total += Number(obra.montoAutorizado);
      bucket.avance_promedio += Number(obra.avanceFisicoReal);
      if (
        obra.estatus === 'en_ejecucion_retraso' ||
        obra.estatus === 'en_riesgo'
      ) {
        bucket.retraso_count += 1;
      }
      bucket.riesgo_promedio += obra.score ? Number(obra.score.riesgoScore) : 0;
      byMun.set(m.id, bucket);
    }

    return [...byMun.values()].map((b) => {
      const invPerCapita = b.poblacion > 0 ? b.inversion_total / b.poblacion : b.inversion_total;
      return {
        ...b,
        avance_promedio:
          b.obras_count > 0
            ? Math.round((b.avance_promedio / b.obras_count) * 100) / 100
            : 0,
        riesgo_promedio:
          b.obras_count > 0
            ? Math.round((b.riesgo_promedio / b.obras_count) * 100) / 100
            : 0,
        inversion_per_capita: Math.round(invPerCapita * 100) / 100,
        gap_index: gapIndex(invPerCapita, b.marginacion, b.poblacion, b.es_zap),
        marginacion_ordinal: marginacionOrdinal(b.marginacion),
      };
    });
  }

  async getContractorScores(user: Usuario) {
    const obras = await this.prisma.accion.findMany({
      where: { ...this.obraWhere(user), contratistaId: { not: null } },
      include: { contratista: true },
    });
    const alertas = await this.prisma.alerta.findMany({
      where: { atendida: false },
      select: { accionId: true },
    });
    const alertasSet = new Set(alertas.map((a) => a.accionId).filter(Boolean) as string[]);

    const byContratista = new Map<string, typeof obras>();
    for (const o of obras) {
      if (!o.contratistaId) continue;
      const list = byContratista.get(o.contratistaId) ?? [];
      list.push(o);
      byContratista.set(o.contratistaId, list);
    }

    return [...byContratista.entries()]
      .map(([id, list]) => ({
        contratista_id: id,
        contratista: list[0].contratista?.nombre ?? '',
        obras_count: list.length,
        score: contractorScore(list, alertasSet),
        avance_promedio:
          Math.round(
            (list.reduce((s, o) => s + Number(o.avanceFisicoReal), 0) / list.length) * 100,
          ) / 100,
        alertas_activas: list.filter((o) => alertasSet.has(o.id)).length,
      }))
      .sort((a, b) => b.score - a.score);
  }

  async getAnomalies(user: Usuario) {
    const scores = await this.prisma.accionScore.findMany({
      where: {
        accion: this.obraWhere(user),
        anomaliaScore: { gte: 20 },
      },
      include: {
        accion: {
          select: { folio: true, nombre: true, municipio: { select: { nombre: true } } },
        },
      },
      orderBy: { anomaliaScore: 'desc' },
    });
    return scores.map((s) => ({
      accion_id: s.accionId,
      folio: s.accion.folio,
      nombre: s.accion.nombre,
      municipio: s.accion.municipio.nombre,
      anomalia_score: Number(s.anomaliaScore),
      riesgo_score: Number(s.riesgoScore),
    }));
  }

  async getForecast(user: Usuario) {
    const scores = await this.prisma.accionScore.findMany({
      where: { accion: this.obraWhere(user) },
      include: { accion: { select: { folio: true, nombre: true, fechaTerminoProgramada: true } } },
    });
    return scores
      .map((s) => ({
        accion_id: s.accionId,
        folio: s.accion.folio,
        nombre: s.accion.nombre,
        fecha_termino_programada: s.accion.fechaTerminoProgramada,
        eac: s.eac ? Number(s.eac) : null,
        vac: s.vac ? Number(s.vac) : null,
        prob_retraso: s.probRetraso ? Number(s.probRetraso) : null,
        prob_sobrecosto: s.probSobrecosto ? Number(s.probSobrecosto) : null,
      }))
      .sort((a, b) => (b.prob_retraso ?? 0) - (a.prob_retraso ?? 0));
  }

  async getMirKpis(user: Usuario) {
    const acciones = await this.prisma.accion.findMany({ where: this.obraWhere(user) });
    return calculateMirFromAcciones(acciones);
  }

  async getCompliance(user: Usuario) {
    const ejercicio = new Date().getFullYear();
    const calendario = proaguaComplianceCalendar(ejercicio);
    const obras = await this.prisma.accion.count({ where: this.obraWhere(user) });
    return { ejercicio, obras_en_alcance: obras, plazos: calendario };
  }

  async getAttentionToday(user: Usuario) {
    const risks = await this.getRiskScores(user);
    const anomalies = await this.getAnomalies(user);
    const compliance = (await this.getCompliance(user)).plazos.filter(
      (p) => p.dias_restantes <= 30 && p.dias_restantes >= -7,
    );
    const recomendacionesRaw = await this.prisma.recomendacion.findMany({
      where: {
        estatus: 'pendiente',
        accion: this.obraWhere(user),
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const recomendaciones = this.dedupeRecommendationsList(recomendacionesRaw).slice(0, 5);
    return {
      top_riesgos: risks.slice(0, 10),
      anomalias: anomalies.slice(0, 10),
      plazos_criticos: compliance,
      recomendaciones_pendientes: recomendacionesRaw.length,
      recomendaciones,
    };
  }

  async getRecommendations(user: Usuario) {
    const rows = await this.prisma.recomendacion.findMany({
      where: { accion: this.obraWhere(user), estatus: 'pendiente' },
      include: { accion: { select: { folio: true, nombre: true } } },
      orderBy: [{ prioridad: 'asc' }, { createdAt: 'desc' }],
    });
    return this.dedupeRecommendationsList(rows);
  }

  async approveRecommendation(id: string, user: Usuario) {
    const rec = await this.prisma.recomendacion.findUnique({
      where: { id },
      include: { accion: true },
    });
    if (!rec) throw new NotFoundException('Recomendacion not found');
    if (rec.accion) this.scope.assertObraAccess(rec.accion, user);
    return this.prisma.recomendacion.update({
      where: { id },
      data: { estatus: 'aprobada', aprobadoPor: user.id },
    });
  }

  private async generateRecommendations(where: Prisma.AccionWhereInput) {
    const scores = await this.prisma.accionScore.findMany({
      where: { accion: where, riesgoScore: { gte: 30 } },
      include: { accion: { select: { id: true, folio: true } } },
    });
    for (const s of scores) {
      const exists = await this.prisma.recomendacion.findFirst({
        where: {
          accionId: s.accionId,
          tipo: 'riesgo_elevado',
          estatus: { in: ['pendiente', 'aprobada'] },
        },
      });
      if (exists) continue;
      const prioridad = Number(s.riesgoScore) >= 60 ? 'alta' : 'media';
      await this.prisma.recomendacion.create({
        data: {
          accionId: s.accionId,
          tipo: 'riesgo_elevado',
          titulo: `Atencion prioritaria: ${s.accion.folio}`,
          descripcion: `Riesgo calculado ${s.riesgoScore} (${s.riesgoNivel}). Revisar avance, estimaciones y alertas.`,
          prioridad,
          factores: s.riesgoFactores as Prisma.InputJsonValue,
        },
      });
    }
    await this.deduplicateRecommendations(where);
  }

  private async syncActivosFromAcciones(where: Prisma.AccionWhereInput) {
    const acciones = await this.prisma.accion.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        caudalLps: true,
        coberturaApMeta: true,
        coberturaTarMeta: true,
        tipoAccion: true,
      },
    });
    for (const a of acciones) {
      const existing = await this.prisma.activoHidraulico.findFirst({
        where: { accionId: a.id },
      });
      if (existing) continue;
      await this.prisma.activoHidraulico.create({
        data: {
          accionId: a.id,
          tipoActivo: a.tipoAccion,
          nombre: a.nombre,
          caudalLps: a.caudalLps,
          condicion: 'operativo',
          criticidad: a.caudalLps ? 'alta' : 'media',
          metadata: {
            cobertura_ap_meta: a.coberturaApMeta,
            cobertura_tar_meta: a.coberturaTarMeta,
          },
        },
      });
    }
  }

  async getActivos(user: Usuario) {
    return this.prisma.activoHidraulico.findMany({
      where: { accion: this.obraWhere(user) },
      include: {
        accion: { select: { folio: true, nombre: true, municipio: { select: { nombre: true } } } },
      },
    });
  }

  async indexDocuments(user: Usuario) {
    const docs = await this.prisma.documento.findMany({
      where: {
        accion: this.obraWhere(user),
        estatus: { not: 'no_cargado' },
      },
      select: { id: true, accionId: true, nombre: true, categoria: true, estatus: true },
    });
    let indexed = 0;
    for (const doc of docs) {
      const exists = await this.prisma.documentChunk.findFirst({
        where: { documentoId: doc.id },
      });
      if (exists) continue;
      await this.prisma.documentChunk.create({
        data: {
          accionId: doc.accionId,
          documentoId: doc.id,
          fuente: 'documento',
          chunkText: `${doc.categoria}: ${doc.nombre} (${doc.estatus})`,
          metadata: { categoria: doc.categoria, estatus: doc.estatus },
        },
      });
      indexed += 1;
    }
    await this.prisma.iaAuditLog.create({
      data: {
        tipo: 'document_index',
        inputs: { count: docs.length },
        outputs: { indexed },
        usuarioId: user.id,
      },
    });
    return { total: docs.length, indexed };
  }

  async searchDocuments(query: string, user: Usuario, limit = 10) {
    const q = query.trim();
    if (!q) return [];

    const acciones = await this.prisma.accion.findMany({
      where: this.obraWhere(user),
      select: { id: true },
    });
    const accionIds = acciones.map((a) => a.id);
    if (accionIds.length === 0) return [];

    try {
      const rows = await this.prisma.$queryRaw<
        Array<{
          id: string;
          accion_id: string | null;
          documento_id: string | null;
          chunk_text: string;
          fuente: string;
          rank: number;
          folio: string | null;
          nombre: string | null;
        }>
      >`
        SELECT dc.id, dc.accion_id, dc.documento_id, dc.chunk_text, dc.fuente,
          (
            COALESCE(ts_rank(to_tsvector('spanish', dc.chunk_text), plainto_tsquery('spanish', ${q})), 0) * 2
            + similarity(dc.chunk_text, ${q})
          )::float AS rank,
          a.folio, a.nombre
        FROM document_chunks dc
        LEFT JOIN acciones a ON a.id = dc.accion_id
        WHERE dc.accion_id IN (${Prisma.join(accionIds)})
          AND (
            to_tsvector('spanish', dc.chunk_text) @@ plainto_tsquery('spanish', ${q})
            OR dc.chunk_text ILIKE ${'%' + q + '%'}
            OR similarity(dc.chunk_text, ${q}) > 0.15
          )
        ORDER BY rank DESC
        LIMIT ${limit}
      `;
      return rows.map((r) => ({
        id: r.id,
        accionId: r.accion_id,
        documentoId: r.documento_id,
        chunkText: r.chunk_text,
        fuente: r.fuente,
        rank: Number(r.rank),
        accion: r.folio ? { folio: r.folio, nombre: r.nombre ?? '' } : null,
      }));
    } catch (err) {
      this.logger.warn(`Lexical search fallback: ${err}`);
      const chunks = await this.prisma.documentChunk.findMany({
        where: {
          accionId: { in: accionIds },
          chunkText: { contains: q, mode: 'insensitive' },
        },
        take: limit,
        include: { accion: { select: { folio: true, nombre: true } } },
      });
      return chunks;
    }
  }

  async runIdp(user: Usuario, accionId?: string, persist = true) {
    const where: Prisma.AccionWhereInput = accionId
      ? { AND: [this.obraWhere(user), { id: accionId }] }
      : this.obraWhere(user);

    const acciones = await this.prisma.accion.findMany({
      where,
      include: { documentos: true, estimaciones: true },
    });

    const payload = acciones.map((a) => ({
      accion: a,
      documentos: a.documentos,
      estimaciones: a.estimaciones,
    }));
    const report = validatePortfolioIdp(payload);

    if (persist) {
      for (const item of report.acciones) {
        for (const d of item.discrepancias) {
          const exists = await this.prisma.recomendacion.findFirst({
            where: {
              accionId: item.accion_id,
              tipo: 'idp_discrepancia',
              titulo: d.titulo,
              estatus: { in: ['pendiente', 'aprobada'] },
            },
          });
          if (exists) continue;
          await this.prisma.recomendacion.create({
            data: {
              accionId: item.accion_id,
              tipo: 'idp_discrepancia',
              titulo: d.titulo,
              descripcion: d.descripcion,
              prioridad: d.severidad === 'alta' ? 'alta' : d.severidad === 'media' ? 'media' : 'baja',
              factores: {
                codigo: d.codigo,
                ...(d.metadata ?? {}),
              } as Prisma.InputJsonValue,
            },
          });
        }
      }
      await this.deduplicateRecommendations(this.obraWhere(user));
      await this.prisma.iaAuditLog.create({
        data: {
          tipo: 'idp_rules',
          inputs: { acciones: acciones.length },
          outputs: {
            total_discrepancias: report.total_discrepancias,
          } as Prisma.InputJsonValue,
          usuarioId: user.id,
        },
      });
    }

    return report;
  }

  async getIdpByAccion(accionId: string, user: Usuario) {
    await this.scope.getObraOrThrow(accionId, user);
    const accion = await this.prisma.accion.findUnique({
      where: { id: accionId },
      include: { documentos: true, estimaciones: true },
    });
    if (!accion) throw new NotFoundException('Accion not found');
    return validateAccionIdp(accion, accion.documentos, accion.estimaciones);
  }

  async generateBriefing(user: Usuario) {
    const kpis = await this.prisma.accion.findMany({ where: this.obraWhere(user) });
    const risks = await this.getRiskScores(user);
    const mir = calculateMirFromAcciones(kpis);
    const attention = await this.getAttentionToday(user);
    const briefing = {
      generated_at: new Date().toISOString(),
      resumen: {
        total_acciones: kpis.length,
        en_riesgo_alto: risks.filter((r) => r.riesgo_nivel === 'rojo').length,
        anomalias: attention.anomalias.length,
        plazos_criticos: attention.plazos_criticos.length,
      },
      mir,
      top_riesgos: risks.slice(0, 5),
      recomendaciones: attention.recomendaciones,
      narrativa: `Portafolio con ${kpis.length} acciones. ${risks.filter((r) => r.riesgo_nivel === 'rojo').length} en riesgo alto. Poblacion beneficiada total: ${mir.poblacion_beneficiada_total}.`,
    };
    await this.prisma.iaAuditLog.create({
      data: {
        tipo: 'executive_briefing',
        inputs: { acciones: kpis.length },
        outputs: briefing.resumen as Prisma.InputJsonValue,
        usuarioId: user.id,
      },
    });
    return briefing;
  }

  async getPortfolioPriority(user: Usuario) {
    const scores = await this.prisma.accionScore.findMany({
      where: { accion: this.obraWhere(user) },
      include: {
        accion: {
          select: {
            folio: true,
            nombre: true,
            poblacionBeneficiada: true,
            municipio: { select: { nombre: true, esZap: true, marginacion: true } },
          },
        },
      },
    });
    return scores
      .map((s) => {
        const pob = s.accion.poblacionBeneficiada ?? 0;
        const priority =
          Number(s.riesgoScore) * 0.4 +
          (s.probRetraso ? Number(s.probRetraso) * 100 : 0) * 0.3 +
          (s.accion.municipio.esZap ? 15 : 0) +
          marginacionOrdinal(s.accion.municipio.marginacion) * 5 +
          Math.log10(pob + 1) * 3;
        return {
          accion_id: s.accionId,
          folio: s.accion.folio,
          nombre: s.accion.nombre,
          municipio: s.accion.municipio.nombre,
          priority_score: Math.round(priority * 100) / 100,
          riesgo_score: Number(s.riesgoScore),
          prob_retraso: s.probRetraso ? Number(s.probRetraso) : null,
        };
      })
      .sort((a, b) => b.priority_score - a.priority_score);
  }

  async semanticMetricQuery(intent: string): Promise<{ metric: string; description: string } | null> {
    const map: Record<string, { metric: string; description: string }> = {
      riesgo: { metric: 'riesgo_score', description: 'Score de riesgo 0-100 por accion' },
      retraso: { metric: 'prob_retraso', description: 'Probabilidad de retraso' },
      sobrecosto: { metric: 'prob_sobrecosto', description: 'Probabilidad de sobrecosto' },
      spi: { metric: 'spi', description: 'Schedule Performance Index' },
      cpi: { metric: 'cpi', description: 'Cost Performance Index' },
      eac: { metric: 'eac', description: 'Estimate at Completion' },
      anomalia: { metric: 'anomalia_score', description: 'Score de anomalia' },
      salud: { metric: 'salud_score', description: 'Salud de portafolio por accion' },
    };
    const key = Object.keys(map).find((k) => intent.toLowerCase().includes(k));
    return key ? map[key] : null;
  }
}
