import { ForbiddenException, Injectable } from '@nestjs/common';
import { Rol, Usuario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MunicipiosService {
  constructor(private readonly prisma: PrismaService) {}

  private async withStats(municipioId: string) {
    const m = await this.prisma.municipio.findUniqueOrThrow({ where: { id: municipioId } });
    const obras = await this.prisma.accion.findMany({ where: { municipioId } });
    const obrasCount = obras.length;
    const inversionTotal = obras.reduce((s, o) => s + Number(o.montoAutorizado), 0);
    const avanceFisicoPromedio =
      obrasCount > 0
        ? obras.reduce((s, o) => s + Number(o.avanceFisicoReal), 0) / obrasCount
        : 0;
    const retrasadas = obras.filter((o) => o.estatus === 'en_ejecucion_retraso').length;
    const concluidas = obras.filter((o) => o.estatus === 'concluida').length;
    const programasActivos = new Set(obras.map((o) => o.programa)).size;
    return {
      id: m.id,
      nombre: m.nombre,
      latitud: m.latitud ? Number(m.latitud) : null,
      longitud: m.longitud ? Number(m.longitud) : null,
      obras_count: obrasCount,
      inversion_total: inversionTotal,
      avance_fisico_promedio: Math.round(avanceFisicoPromedio * 100) / 100,
      obras_retrasadas: retrasadas,
      obras_concluidas: concluidas,
      programas_activos: programasActivos,
    };
  }

  async findAll(user: Usuario) {
    let municipios = await this.prisma.municipio.findMany({ orderBy: { nombre: 'asc' } });
    if (user.rol === Rol.municipal && user.municipioId) {
      municipios = municipios.filter((m) => m.id === user.municipioId);
    }
    if (user.rol === Rol.contratista) {
      const ids = await this.prisma.accion.findMany({
        where: { contratistaId: user.contratistaId ?? undefined },
        select: { municipioId: true },
        distinct: ['municipioId'],
      });
      const allowed = new Set(ids.map((i) => i.municipioId));
      municipios = municipios.filter((m) => allowed.has(m.id));
    }
    return Promise.all(municipios.map((m) => this.withStats(m.id)));
  }

  async findOne(id: string, user: Usuario) {
    if (user.rol === Rol.municipal && user.municipioId !== id) {
      throw new ForbiddenException('Access denied');
    }
    return this.withStats(id);
  }

  async create(data: { nombre: string; latitud?: number; longitud?: number }, user: Usuario) {
    if (user.rol !== Rol.estatal) throw new ForbiddenException('Only estatal');
    const m = await this.prisma.municipio.create({ data });
    return this.withStats(m.id);
  }

  async remove(id: string, user: Usuario) {
    if (user.rol !== Rol.estatal) throw new ForbiddenException('Only estatal');
    await this.prisma.municipio.delete({ where: { id } });
    return { deleted: true };
  }
}
