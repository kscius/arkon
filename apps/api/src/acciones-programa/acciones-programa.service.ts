import { Injectable } from '@nestjs/common';
import { Usuario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccionesProgramaService {
  constructor(private readonly prisma: PrismaService) {}

  private map(a: {
    id: string;
    programa: string;
    componente: string;
    subcomponente: string;
    clave: string;
    descripcion: string;
    unidad: string;
    tipoLocalidad: string;
    activo: boolean;
  }) {
    return {
      id: a.id,
      programa: a.programa,
      componente: a.componente,
      subcomponente: a.subcomponente,
      clave: a.clave,
      descripcion: a.descripcion,
      unidad: a.unidad,
      tipo_localidad: a.tipoLocalidad,
      activo: a.activo,
    };
  }

  async findAll(_user: Usuario, programa?: string) {
    const list = await this.prisma.accionPrograma.findMany({
      where: {
        activo: true,
        ...(programa ? { programa: { equals: programa, mode: 'insensitive' } } : {}),
      },
      orderBy: [{ programa: 'asc' }, { clave: 'asc' }],
    });
    return list.map((a) => this.map(a));
  }
}
