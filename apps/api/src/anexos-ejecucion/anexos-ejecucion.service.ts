import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Rol, Usuario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnexosEjecucionService {
  constructor(private readonly prisma: PrismaService) {}

  private mapEjecucion(a: {
    id: string;
    numero: string;
    ejercicioFiscal: number;
    entidadFederativa: string;
    montoFederal: unknown;
    montoEstatal: unknown;
    fechaFirma: string | null;
    fechaVigenciaFin: string | null;
    estatus: string;
    archivoUrl: string | null;
  }) {
    return {
      id: a.id,
      numero: a.numero,
      ejercicio_fiscal: a.ejercicioFiscal,
      entidad_federativa: a.entidadFederativa,
      monto_federal: Number(a.montoFederal),
      monto_estatal: Number(a.montoEstatal),
      fecha_firma: a.fechaFirma,
      fecha_vigencia_fin: a.fechaVigenciaFin,
      estatus: a.estatus,
      archivo_url: a.archivoUrl,
    };
  }

  private mapTecnico(t: {
    id: string;
    anexoEjecucionId: string;
    organismoOperadorId: string | null;
    ejercicioFiscal: number;
    tipoLocalidad: string;
    estatus: string;
    archivoUrl: string | null;
    organismoOperador?: { nombre: string } | null;
  }) {
    return {
      id: t.id,
      anexo_ejecucion_id: t.anexoEjecucionId,
      organismo_operador_id: t.organismoOperadorId,
      ejercicio_fiscal: t.ejercicioFiscal,
      tipo_localidad: t.tipoLocalidad,
      estatus: t.estatus,
      archivo_url: t.archivoUrl,
      organismo_operador_nombre: t.organismoOperador?.nombre ?? '',
    };
  }

  async findAll(_user: Usuario) {
    const list = await this.prisma.anexoEjecucion.findMany({
      orderBy: [{ ejercicioFiscal: 'desc' }, { numero: 'asc' }],
    });
    return list.map((a) => this.mapEjecucion(a));
  }

  async findOne(id: string, _user: Usuario) {
    const a = await this.prisma.anexoEjecucion.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Anexo de ejecucion not found');
    return this.mapEjecucion(a);
  }

  async create(
    data: {
      numero: string;
      ejercicio_fiscal: number;
      entidad_federativa: string;
      monto_federal: number;
      monto_estatal: number;
      fecha_firma?: string;
      fecha_vigencia_fin?: string;
      estatus?: string;
      archivo_url?: string;
    },
    user: Usuario,
  ) {
    if (user.rol === Rol.contratista) throw new ForbiddenException();
    const a = await this.prisma.anexoEjecucion.create({
      data: {
        numero: data.numero,
        ejercicioFiscal: data.ejercicio_fiscal,
        entidadFederativa: data.entidad_federativa,
        montoFederal: data.monto_federal,
        montoEstatal: data.monto_estatal,
        fechaFirma: data.fecha_firma,
        fechaVigenciaFin: data.fecha_vigencia_fin,
        estatus: data.estatus ?? 'vigente',
        archivoUrl: data.archivo_url,
      },
    });
    return this.mapEjecucion(a);
  }

  async update(id: string, data: Record<string, unknown>, user: Usuario) {
    if (user.rol === Rol.contratista) throw new ForbiddenException();
    await this.findOne(id, user);
    const a = await this.prisma.anexoEjecucion.update({
      where: { id },
      data: {
        numero: data.numero as string | undefined,
        ejercicioFiscal: data.ejercicio_fiscal as number | undefined,
        entidadFederativa: data.entidad_federativa as string | undefined,
        montoFederal: data.monto_federal as number | undefined,
        montoEstatal: data.monto_estatal as number | undefined,
        fechaFirma: data.fecha_firma as string | undefined,
        fechaVigenciaFin: data.fecha_vigencia_fin as string | undefined,
        estatus: data.estatus as string | undefined,
        archivoUrl: data.archivo_url as string | undefined,
      },
    });
    return this.mapEjecucion(a);
  }

  async remove(id: string, user: Usuario) {
    if (user.rol !== Rol.estatal) throw new ForbiddenException('Only estatal');
    await this.findOne(id, user);
    await this.prisma.anexoEjecucion.delete({ where: { id } });
    return { deleted: true };
  }

  async listTecnicos(anexoId: string, user: Usuario) {
    await this.findOne(anexoId, user);
    const list = await this.prisma.anexoTecnico.findMany({
      where: { anexoEjecucionId: anexoId },
      include: { organismoOperador: true },
      orderBy: { ejercicioFiscal: 'asc' },
    });
    return list.map((t) => this.mapTecnico(t));
  }

  async createTecnico(
    anexoId: string,
    data: {
      organismo_operador_id?: string;
      ejercicio_fiscal: number;
      tipo_localidad: string;
      estatus?: string;
      archivo_url?: string;
    },
    user: Usuario,
  ) {
    if (user.rol === Rol.contratista) throw new ForbiddenException();
    await this.findOne(anexoId, user);
    const t = await this.prisma.anexoTecnico.create({
      data: {
        anexoEjecucionId: anexoId,
        organismoOperadorId: data.organismo_operador_id,
        ejercicioFiscal: data.ejercicio_fiscal,
        tipoLocalidad: data.tipo_localidad,
        estatus: data.estatus ?? 'vigente',
        archivoUrl: data.archivo_url,
      },
      include: { organismoOperador: true },
    });
    return this.mapTecnico(t);
  }

  async updateTecnico(anexoId: string, tecnicoId: string, data: Record<string, unknown>, user: Usuario) {
    if (user.rol === Rol.contratista) throw new ForbiddenException();
    await this.findOne(anexoId, user);
    const existing = await this.prisma.anexoTecnico.findFirst({
      where: { id: tecnicoId, anexoEjecucionId: anexoId },
    });
    if (!existing) throw new NotFoundException('Anexo tecnico not found');
    const t = await this.prisma.anexoTecnico.update({
      where: { id: tecnicoId },
      data: {
        organismoOperadorId: data.organismo_operador_id as string | undefined,
        ejercicioFiscal: data.ejercicio_fiscal as number | undefined,
        tipoLocalidad: data.tipo_localidad as string | undefined,
        estatus: data.estatus as string | undefined,
        archivoUrl: data.archivo_url as string | undefined,
      },
      include: { organismoOperador: true },
    });
    return this.mapTecnico(t);
  }

  async removeTecnico(anexoId: string, tecnicoId: string, user: Usuario) {
    if (user.rol !== Rol.estatal) throw new ForbiddenException('Only estatal');
    await this.findOne(anexoId, user);
    const existing = await this.prisma.anexoTecnico.findFirst({
      where: { id: tecnicoId, anexoEjecucionId: anexoId },
    });
    if (!existing) throw new NotFoundException('Anexo tecnico not found');
    await this.prisma.anexoTecnico.delete({ where: { id: tecnicoId } });
    return { deleted: true };
  }
}
