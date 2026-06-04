import { ForbiddenException, Injectable } from '@nestjs/common';
import { EstatusObra, Prisma, Rol, Usuario } from '@prisma/client';
import { ScopeService } from '../common/scope.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  private obraWhere(user: Usuario): Prisma.ObraWhereInput {
    return this.scope.obraWhere(user);
  }

  private alertaWhere(user: Usuario): Prisma.AlertaWhereInput {
    return this.scope.alertaWhere(user);
  }

  async getKpis(user: Usuario) {
    const obraWhere = this.obraWhere(user);
    const obras = await this.prisma.obra.findMany({ where: obraWhere });

    const totalObras = obras.length;
    const obrasEjecucion = obras.filter(
      (o) =>
        o.estatus === EstatusObra.en_ejecucion_a_tiempo ||
        o.estatus === EstatusObra.en_ejecucion_retraso,
    ).length;
    const obrasRetraso = obras.filter((o) => o.estatus === EstatusObra.en_ejecucion_retraso).length;
    const obrasConcluidas = obras.filter((o) => o.estatus === EstatusObra.concluida).length;
    const obrasRiesgo = obras.filter(
      (o) =>
        o.estatus === EstatusObra.en_riesgo ||
        o.estatus === EstatusObra.en_ejecucion_retraso,
    ).length;
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
    const rows = await this.prisma.obra.groupBy({
      by: ['estatus'],
      where: this.obraWhere(user),
      _count: { id: true },
    });
    return rows.map((r) => ({ estatus: r.estatus, count: r._count.id }));
  }

  async obrasPorPrograma(user: Usuario) {
    const rows = await this.prisma.obra.groupBy({
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
    const rows = await this.prisma.obra.groupBy({
      by: ['municipioId'],
      where: this.obraWhere(user),
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });
    const municipioIds = rows.map((r) => r.municipioId);
    const municipios = await this.prisma.municipio.findMany({
      where: { id: { in: municipioIds } },
    });
    const nameById = new Map(municipios.map((m) => [m.id, m.nombre]));
    return rows.map((r) => ({
      municipio: nameById.get(r.municipioId) ?? '',
      obras_count: r._count.id,
    }));
  }

  async avanceTimeline(user: Usuario) {
    const obraWhere = this.obraWhere(user);
    const avances = await this.prisma.avanceMensual.findMany({
      where: { obra: obraWhere },
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
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([periodo, vals]) => ({
        mes: periodo,
        programado: Math.round(avg(vals.programado) * 10) / 10,
        real: Math.round(avg(vals.reportado) * 10) / 10,
      }));
  }
}
