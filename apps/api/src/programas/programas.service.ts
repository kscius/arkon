import { Injectable } from '@nestjs/common';
import { Usuario } from '@prisma/client';
import { ScopeService } from '../common/scope.service';
import { PrismaService } from '../prisma/prisma.service';

const PROGRAMA_META: Record<string, { nombre: string; descripcion: string }> = {
  PROAGUA: {
    nombre: 'Programa de Agua Potable, Drenaje y Saneamiento',
    descripcion: 'Obras de abastecimiento, redes, saneamiento y plantas en municipios y OOAPAS.',
  },
  PEAS: {
    nombre: 'Programa para el Fortalecimiento de Entidades de Agua y Saneamiento',
    descripcion: 'Fortalecimiento institucional y eficiencia de organismos operadores.',
  },
  PRODDER: {
    nombre: 'Programa de Devolución de Derechos',
    descripcion: 'Inversión en eficiencia, macromedición y rehabilitación de redes.',
  },
};

@Injectable()
export class ProgramasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  async listOverview(user: Usuario) {
    const where = this.scope.obraWhere(user);
    const acciones = await this.prisma.accion.findMany({
      where,
      select: {
        programa: true,
        montoAutorizado: true,
        montoEjercido: true,
        avanceFisicoReal: true,
        estatus: true,
        obraFisicaId: true,
      },
    });

    const byPrograma = new Map<
      string,
      {
        acciones_count: number;
        obras_count: number;
        monto_autorizado: number;
        monto_ejercido: number;
        avance_sum: number;
        en_ejecucion: number;
        con_retraso: number;
        obra_ids: Set<string>;
      }
    >();

    for (const a of acciones) {
      const key = a.programa || 'SIN_PROGRAMA';
      const bucket = byPrograma.get(key) ?? {
        acciones_count: 0,
        obras_count: 0,
        monto_autorizado: 0,
        monto_ejercido: 0,
        avance_sum: 0,
        en_ejecucion: 0,
        con_retraso: 0,
        obra_ids: new Set<string>(),
      };
      bucket.acciones_count += 1;
      bucket.monto_autorizado += Number(a.montoAutorizado);
      bucket.monto_ejercido += Number(a.montoEjercido);
      bucket.avance_sum += Number(a.avanceFisicoReal);
      if (a.estatus === 'en_ejecucion_a_tiempo' || a.estatus === 'en_ejecucion_retraso') {
        bucket.en_ejecucion += 1;
      }
      if (a.estatus === 'en_ejecucion_retraso') bucket.con_retraso += 1;
      if (a.obraFisicaId) bucket.obra_ids.add(a.obraFisicaId);
      byPrograma.set(key, bucket);
    }

    const catalog = await this.prisma.programa.findMany({ orderBy: { nombreCorto: 'asc' } });
    const catalogByShort = new Map(catalog.map((p) => [p.nombreCorto, p]));

    return [...byPrograma.entries()]
      .map(([id, stats]) => {
        const meta = PROGRAMA_META[id] ?? { nombre: id, descripcion: '' };
        const cat = catalogByShort.get(id);
        return {
          id,
          nombre: cat?.nombre ?? meta.nombre,
          nombre_corto: cat?.nombreCorto ?? id,
          descripcion: meta.descripcion,
          dependencia: cat?.dependencia ?? 'CONAGUA',
          acciones_count: stats.acciones_count,
          obras_count: stats.obra_ids.size,
          monto_autorizado: stats.monto_autorizado,
          monto_ejercido: stats.monto_ejercido,
          avance_fisico_promedio:
            stats.acciones_count > 0
              ? Math.round((stats.avance_sum / stats.acciones_count) * 100) / 100
              : 0,
          acciones_en_ejecucion: stats.en_ejecucion,
          acciones_con_retraso: stats.con_retraso,
        };
      })
      .sort((a, b) => b.monto_autorizado - a.monto_autorizado);
  }

  async getProgramaAcciones(user: Usuario, programaId: string) {
    const where = { ...this.scope.obraWhere(user), programa: programaId };
    const acciones = await this.prisma.accion.findMany({
      where,
      include: {
        municipio: true,
        contratista: true,
        obraFisica: true,
        score: true,
      },
      orderBy: { nombre: 'asc' },
    });
    return acciones.map((a) => ({
      id: a.id,
      folio: a.folio,
      nombre: a.nombre,
      cua: a.cua,
      estatus: a.estatus,
      municipio: a.municipio?.nombre ?? '',
      contratista: a.contratista?.nombre ?? '',
      monto_autorizado: Number(a.montoAutorizado),
      monto_ejercido: Number(a.montoEjercido),
      avance_fisico_real: Number(a.avanceFisicoReal),
      avance_financiero: Number(a.avanceFinanciero),
      obra_fisica_id: a.obraFisicaId,
      obra_fisica_nombre: a.obraFisica?.nombre ?? null,
      obra_fisica_clave: a.obraFisica?.clave ?? null,
      riesgo_nivel: a.score?.riesgoNivel ?? null,
    }));
  }
}
