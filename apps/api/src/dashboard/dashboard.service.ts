import { ForbiddenException, Injectable } from '@nestjs/common';
import { EstatusObra, Prisma, Rol, Usuario } from '@prisma/client';
import { toCsv } from '../common/csv.util';
import { comparePeriodo } from '../common/periodo.util';
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
      (o) => o.estatus === EstatusObra.en_ejecucion_a_tiempo,
    ).length;
    const obrasRetraso = obras.filter((o) => o.estatus === EstatusObra.en_ejecucion_retraso).length;
    const obrasConcluidas = obras.filter((o) => o.estatus === EstatusObra.concluida).length;
    const obrasRiesgo = obras.filter((o) => o.estatus === EstatusObra.en_riesgo).length;
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
    const obras = await this.prisma.obra.findMany({
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
      '# Obras por estatus',
      toCsv(
        porEstatus.map((r) => ({ estatus: r.estatus, count: r.count })),
        [
          { key: 'estatus', header: 'Estatus' },
          { key: 'count', header: 'Cantidad' },
        ],
      ),
      '',
      '# Obras por programa',
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
    const where: Prisma.ObraWhereInput = {
      ...this.obraWhere(user),
      contratistaId: { not: null },
    };
    if (programa) where.programa = programa;

    const obras = await this.prisma.obra.findMany({
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
      select: { obraId: true },
    });
    const obrasConAlerta = new Set(alertas.map((a) => a.obraId).filter(Boolean));

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
      .slice(0, 15)
      .map(({ ranking_score: _rs, ...rest }) => rest);
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
      .sort(([a], [b]) => comparePeriodo(a, b))
      .map(([periodo, vals]) => ({
        mes: periodo,
        programado: Math.round(avg(vals.programado) * 10) / 10,
        real: Math.round(avg(vals.reportado) * 10) / 10,
      }));
  }
}
