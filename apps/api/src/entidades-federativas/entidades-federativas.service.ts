import { Injectable, NotFoundException } from '@nestjs/common';
import { Usuario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EntidadesFederativasService {
  constructor(private readonly prisma: PrismaService) {}

  private map(e: { id: string; nombre: string; clave: string }) {
    return { id: e.id, nombre: e.nombre, clave: e.clave };
  }

  async findAll(_user: Usuario) {
    const list = await this.prisma.entidadFederativa.findMany({ orderBy: { nombre: 'asc' } });
    return list.map((e) => this.map(e));
  }

  async findOne(id: string, _user: Usuario) {
    const e = await this.prisma.entidadFederativa.findUnique({ where: { id } });
    if (!e) throw new NotFoundException('Entidad federativa not found');
    return this.map(e);
  }
}
