import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Rol, Usuario } from '@prisma/client';
import { ScopeService } from '../common/scope.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CofinanciamientosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  private map(c: {
    id: string;
    accionId: string;
    fuente: string;
    monto: unknown;
    porcentaje: unknown;
    descripcion: string | null;
  }) {
    return {
      id: c.id,
      obra_id: c.accionId,
      fuente: c.fuente,
      monto: Number(c.monto),
      porcentaje: Number(c.porcentaje),
      descripcion: c.descripcion,
    };
  }

  async listByObra(obraId: string, user: Usuario) {
    await this.scope.getObraOrThrow(obraId, user);
    const items = await this.prisma.cofinanciamiento.findMany({
      where: { accionId: obraId },
      orderBy: { fuente: 'asc' },
    });
    return items.map((c) => this.map(c));
  }

  async create(
    obraId: string,
    data: { fuente: string; monto: number; porcentaje?: number; descripcion?: string },
    user: Usuario,
  ) {
    if (user.rol === Rol.contratista) throw new ForbiddenException();
    await this.scope.getObraOrThrow(obraId, user);
    const c = await this.prisma.cofinanciamiento.create({
      data: {
        accionId: obraId,
        fuente: data.fuente,
        monto: data.monto,
        porcentaje: data.porcentaje ?? 0,
        descripcion: data.descripcion,
      },
    });
    return this.map(c);
  }

  async update(
    id: string,
    data: { fuente?: string; monto?: number; porcentaje?: number; descripcion?: string },
    user: Usuario,
  ) {
    if (user.rol === Rol.contratista) throw new ForbiddenException();
    const existing = await this.prisma.cofinanciamiento.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Cofinanciamiento not found');
    await this.scope.getObraOrThrow(existing.accionId, user);
    const c = await this.prisma.cofinanciamiento.update({
      where: { id },
      data: {
        fuente: data.fuente,
        monto: data.monto,
        porcentaje: data.porcentaje,
        descripcion: data.descripcion,
      },
    });
    return this.map(c);
  }

  async remove(id: string, user: Usuario) {
    if (user.rol === Rol.contratista) throw new ForbiddenException();
    const existing = await this.prisma.cofinanciamiento.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Cofinanciamiento not found');
    await this.scope.getObraOrThrow(existing.accionId, user);
    await this.prisma.cofinanciamiento.delete({ where: { id } });
    return { deleted: true };
  }
}
