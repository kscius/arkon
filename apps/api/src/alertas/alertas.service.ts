import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Rol, Usuario } from '@prisma/client';
import { ScopeService } from '../common/scope.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AlertasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  private map(
    a: Prisma.AlertaGetPayload<{ include: { obra: { select: { nombre: true } } } }>,
  ) {
    return {
      id: a.id,
      obra_id: a.obraId,
      municipio: a.municipio,
      municipio_id: a.municipioId,
      titulo: a.titulo,
      descripcion: a.descripcion,
      tipo: a.tipo,
      severidad: a.severidad,
      fecha_generacion: a.fechaGeneracion,
      atendida: a.atendida,
      accion_tomada: a.accionTomada,
      obra_nombre: a.obra?.nombre ?? '',
    };
  }

  async findAll(
    user: Usuario,
    filters: { atendida?: boolean; severidad?: string },
  ) {
    const where: Prisma.AlertaWhereInput = { ...this.scope.alertaWhere(user) };
    if (filters.atendida !== undefined) where.atendida = filters.atendida;
    if (filters.severidad) where.severidad = filters.severidad;

    const alertas = await this.prisma.alerta.findMany({
      where,
      include: { obra: { select: { nombre: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return alertas.map((a) => this.map(a));
  }

  async findOne(id: string, user: Usuario) {
    const alerta = await this.prisma.alerta.findFirst({
      where: { id, ...this.scope.alertaWhere(user) },
      include: { obra: { select: { nombre: true } } },
    });
    if (!alerta) throw new NotFoundException('Alerta not found');
    return this.map(alerta);
  }

  async create(
    data: {
      obra_id?: string;
      municipio: string;
      municipio_id?: string;
      titulo: string;
      descripcion: string;
      tipo: string;
      severidad: string;
      fecha_generacion: string;
    },
    user: Usuario,
  ) {
    if (user.rol === Rol.contratista) {
      throw new ForbiddenException('Permission denied');
    }
    let municipioId = data.municipio_id;
    if (user.rol === Rol.municipal && user.municipioId) {
      municipioId = user.municipioId;
    }
    if (data.obra_id) {
      await this.scope.getObraOrThrow(data.obra_id, user);
    }
    const alerta = await this.prisma.alerta.create({
      data: {
        obraId: data.obra_id,
        municipio: data.municipio,
        municipioId,
        titulo: data.titulo,
        descripcion: data.descripcion,
        tipo: data.tipo,
        severidad: data.severidad,
        fechaGeneracion: data.fecha_generacion,
        atendida: false,
      },
      include: { obra: { select: { nombre: true } } },
    });
    return this.map(alerta);
  }

  async atender(id: string, accionTomada: string, user: Usuario) {
    const alerta = await this.prisma.alerta.findFirst({
      where: { id, ...this.scope.alertaWhere(user) },
    });
    if (!alerta) throw new NotFoundException('Alerta not found');
    await this.prisma.alerta.update({
      where: { id },
      data: { atendida: true, accionTomada },
    });
    return { status: 'success', atendida: true };
  }
}
