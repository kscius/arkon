import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Rol, Usuario } from '@prisma/client';
import { canManageSolicitudInstitutional } from '../common/proagua-roles.util';
import { PrismaService } from '../prisma/prisma.service';

const VALID_TRANSITIONS: Record<string, string[]> = {
  borrador: ['presentada'],
  presentada: ['en_revision', 'rechazada'],
  en_revision: ['aprobada', 'rechazada'],
  aprobada: [],
  rechazada: [],
};

@Injectable()
export class SolicitudesProgramaService {
  constructor(private readonly prisma: PrismaService) {}

  private map(s: {
    id: string;
    programa: string;
    ejercicioFiscal: number;
    entidadId: string;
    municipioId: string;
    tipoApoyo: string;
    componente: string;
    montoSolicitado: unknown;
    estatus: string;
    accionResultanteId: string | null;
    entidad?: { nombre: string } | null;
    municipio?: { nombre: string } | null;
    accionResultante?: { folio: string } | null;
  }) {
    return {
      id: s.id,
      programa: s.programa,
      ejercicio_fiscal: s.ejercicioFiscal,
      entidad_id: s.entidadId,
      municipio_id: s.municipioId,
      tipo_apoyo: s.tipoApoyo,
      componente: s.componente,
      monto_solicitado: Number(s.montoSolicitado),
      estatus: s.estatus,
      obra_resultante_id: s.accionResultanteId,
      obra_resultante_folio: s.accionResultante?.folio ?? null,
      entidad_nombre: s.entidad?.nombre ?? '',
      municipio_nombre: s.municipio?.nombre ?? '',
    };
  }

  private solicitudWhere(user: Usuario) {
    if (user.rol === Rol.estatal) return {};
    if (user.rol === Rol.municipal && user.municipioId) {
      return { municipioId: user.municipioId };
    }
    return { id: '00000000-0000-0000-0000-000000000000' };
  }

  async findAll(user: Usuario, estatus?: string) {
    const list = await this.prisma.solicitudPrograma.findMany({
      where: {
        ...this.solicitudWhere(user),
        ...(estatus ? { estatus } : {}),
      },
      include: { entidad: true, municipio: true, accionResultante: true },
      orderBy: [{ ejercicioFiscal: 'desc' }, { createdAt: 'desc' }],
    });
    return list.map((s) => this.map(s));
  }

  async findOne(id: string, user: Usuario) {
    const s = await this.prisma.solicitudPrograma.findFirst({
      where: { id, ...this.solicitudWhere(user) },
      include: { entidad: true, municipio: true, accionResultante: true },
    });
    if (!s) throw new NotFoundException('Solicitud not found');
    return this.map(s);
  }

  async create(
    data: {
      programa: string;
      ejercicio_fiscal: number;
      entidad_id: string;
      municipio_id: string;
      tipo_apoyo: string;
      componente: string;
      monto_solicitado: number;
    },
    user: Usuario,
  ) {
    if (user.rol === Rol.contratista) throw new ForbiddenException();
    const municipioId =
      user.rol === Rol.municipal && user.municipioId ? user.municipioId : data.municipio_id;
    const s = await this.prisma.solicitudPrograma.create({
      data: {
        programa: data.programa,
        ejercicioFiscal: data.ejercicio_fiscal,
        entidadId: data.entidad_id,
        municipioId,
        tipoApoyo: data.tipo_apoyo,
        componente: data.componente,
        montoSolicitado: data.monto_solicitado,
        estatus: 'borrador',
      },
      include: { entidad: true, municipio: true, accionResultante: true },
    });
    return this.map(s);
  }

  async update(
    id: string,
    data: {
      tipo_apoyo?: string;
      componente?: string;
      monto_solicitado?: number;
      obra_resultante_id?: string;
    },
    user: Usuario,
  ) {
    const existing = await this.findOne(id, user);
    if (existing.estatus !== 'borrador' && user.rol !== Rol.estatal) {
      throw new ForbiddenException('Only borrador solicitudes can be edited');
    }
    const s = await this.prisma.solicitudPrograma.update({
      where: { id },
      data: {
        tipoApoyo: data.tipo_apoyo,
        componente: data.componente,
        montoSolicitado: data.monto_solicitado,
        accionResultanteId: data.obra_resultante_id,
      },
      include: { entidad: true, municipio: true, accionResultante: true },
    });
    return this.map(s);
  }

  async transition(id: string, nuevoEstatus: string, user: Usuario, obraResultanteId?: string) {
    const existing = await this.findOne(id, user);
    const allowed = VALID_TRANSITIONS[existing.estatus] ?? [];
    if (!allowed.includes(nuevoEstatus)) {
      throw new BadRequestException(
        `Cannot transition from ${existing.estatus} to ${nuevoEstatus}`,
      );
    }
    if (nuevoEstatus === 'presentada' && user.rol === Rol.contratista) {
      throw new ForbiddenException();
    }
    if (['aprobada', 'rechazada', 'en_revision'].includes(nuevoEstatus)) {
      if (!canManageSolicitudInstitutional(user)) {
        throw new ForbiddenException('Insufficient institutional role for this transition');
      }
    }
    if (nuevoEstatus === 'aprobada') {
      const obraId = obraResultanteId ?? existing.obra_resultante_id;
      if (!obraId) {
        throw new BadRequestException('obra_resultante_id is required to approve a solicitud');
      }
    }
    const s = await this.prisma.solicitudPrograma.update({
      where: { id },
      data: {
        estatus: nuevoEstatus,
        ...(nuevoEstatus === 'aprobada'
          ? { accionResultanteId: obraResultanteId ?? existing.obra_resultante_id ?? undefined }
          : {}),
      },
      include: { entidad: true, municipio: true, accionResultante: true },
    });
    return this.map(s);
  }

  async remove(id: string, user: Usuario) {
    const existing = await this.findOne(id, user);
    if (existing.estatus !== 'borrador' && user.rol !== Rol.estatal) {
      throw new ForbiddenException('Only borrador solicitudes can be deleted');
    }
    await this.prisma.solicitudPrograma.delete({ where: { id } });
    return { deleted: true };
  }
}
