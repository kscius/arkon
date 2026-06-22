import { ForbiddenException, Injectable } from '@nestjs/common';
import { Rol, Usuario } from '@prisma/client';
import { ScopeService } from '../common/scope.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrganismosOperadoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  private map(oo: {
    id: string;
    nombre: string;
    siglas: string | null;
    tipoOrganismo: string;
    entidadId: string | null;
    municipioId: string | null;
    rfc: string | null;
    director: string | null;
    email: string | null;
    telefono: string | null;
    entidad?: { nombre: string } | null;
    municipio?: { nombre: string } | null;
  }) {
    return {
      id: oo.id,
      nombre: oo.nombre,
      siglas: oo.siglas,
      tipo_organismo: oo.tipoOrganismo,
      entidad_id: oo.entidadId,
      municipio_id: oo.municipioId,
      rfc: oo.rfc,
      director: oo.director,
      email: oo.email,
      telefono: oo.telefono,
      entidad_nombre: oo.entidad?.nombre ?? '',
      municipio_nombre: oo.municipio?.nombre ?? '',
    };
  }

  async findAll(user: Usuario) {
    const list = await this.prisma.organismoOperador.findMany({
      where: this.scope.organismoOperadorWhere(user),
      include: { entidad: true, municipio: true },
      orderBy: { nombre: 'asc' },
    });
    return list.map((oo) => this.map(oo));
  }

  async findOne(id: string, user: Usuario) {
    const oo = await this.prisma.organismoOperador.findFirst({
      where: { id, ...this.scope.organismoOperadorWhere(user) },
      include: { entidad: true, municipio: true },
    });
    if (!oo) throw new ForbiddenException('Access denied');
    return this.map(oo);
  }

  async create(
    data: {
      nombre: string;
      tipo_organismo: string;
      siglas?: string;
      entidad_id?: string;
      municipio_id?: string;
      rfc?: string;
      director?: string;
      email?: string;
      telefono?: string;
    },
    user: Usuario,
  ) {
    if (user.rol === Rol.contratista) throw new ForbiddenException();
    const oo = await this.prisma.organismoOperador.create({
      data: {
        nombre: data.nombre,
        tipoOrganismo: data.tipo_organismo,
        siglas: data.siglas,
        entidadId: data.entidad_id,
        municipioId: data.municipio_id,
        rfc: data.rfc,
        director: data.director,
        email: data.email,
        telefono: data.telefono,
      },
      include: { entidad: true, municipio: true },
    });
    return this.map(oo);
  }

  async update(id: string, data: Record<string, string | undefined>, user: Usuario) {
    if (user.rol === Rol.contratista) throw new ForbiddenException();
    await this.findOne(id, user);
    const oo = await this.prisma.organismoOperador.update({
      where: { id },
      data: {
        nombre: data.nombre,
        tipoOrganismo: data.tipo_organismo,
        siglas: data.siglas,
        entidadId: data.entidad_id,
        municipioId: data.municipio_id,
        rfc: data.rfc,
        director: data.director,
        email: data.email,
        telefono: data.telefono,
      },
      include: { entidad: true, municipio: true },
    });
    return this.map(oo);
  }

  async remove(id: string, user: Usuario) {
    if (user.rol !== Rol.estatal) throw new ForbiddenException('Only estatal');
    await this.findOne(id, user);
    await this.prisma.organismoOperador.delete({ where: { id } });
    return { deleted: true };
  }
}
