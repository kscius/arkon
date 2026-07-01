import { ForbiddenException, Injectable } from '@nestjs/common';
import { Rol, Usuario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContratistasService {
  constructor(private readonly prisma: PrismaService) {}

  private async withStats(id: string) {
    const c = await this.prisma.contratista.findUniqueOrThrow({ where: { id } });
    const obras = await this.prisma.accion.findMany({ where: { contratistaId: id } });
    const obrasAsignadas = obras.length;
    const montoTotal = obras.reduce((s, o) => s + Number(o.montoContratado), 0);
    const avancePromedio =
      obrasAsignadas > 0
        ? obras.reduce((s, o) => s + Number(o.avanceFisicoReal), 0) / obrasAsignadas
        : 0;
    return {
      id: c.id,
      nombre: c.nombre,
      rfc: c.rfc,
      representante: c.representante,
      email: c.email,
      telefono: c.telefono,
      registro_padron: c.registroPadron,
      obras_asignadas: obrasAsignadas,
      monto_total: montoTotal,
      avance_promedio: Math.round(avancePromedio * 100) / 100,
    };
  }

  async findAll(user: Usuario) {
    let list = await this.prisma.contratista.findMany({ orderBy: { nombre: 'asc' } });
    if (user.rol === Rol.contratista && user.contratistaId) {
      list = list.filter((c) => c.id === user.contratistaId);
    }
    if (user.rol === Rol.municipal && user.municipioId) {
      const ids = await this.prisma.accion.findMany({
        where: { municipioId: user.municipioId },
        select: { contratistaId: true },
        distinct: ['contratistaId'],
      });
      const allowed = new Set(ids.map((i) => i.contratistaId).filter(Boolean));
      list = list.filter((c) => allowed.has(c.id));
    }
    return Promise.all(list.map((c) => this.withStats(c.id)));
  }

  async findOne(id: string, user: Usuario) {
    if (user.rol === Rol.contratista && user.contratistaId !== id) {
      throw new ForbiddenException('Access denied');
    }
    return this.withStats(id);
  }

  async create(
    data: {
      nombre: string;
      rfc: string;
      representante: string;
      email?: string;
      telefono?: string;
      registro_padron?: string;
    },
    user: Usuario,
  ) {
    if (user.rol === Rol.contratista) throw new ForbiddenException();
    const c = await this.prisma.contratista.create({ data });
    return this.withStats(c.id);
  }

  async update(id: string, data: Record<string, string | undefined>, user: Usuario) {
    if (user.rol === Rol.contratista) throw new ForbiddenException();
    await this.prisma.contratista.update({ where: { id }, data });
    return this.withStats(id);
  }

  async remove(id: string, user: Usuario) {
    if (user.rol !== Rol.estatal) throw new ForbiddenException('Only estatal');
    await this.prisma.contratista.delete({ where: { id } });
    return { deleted: true };
  }
}
