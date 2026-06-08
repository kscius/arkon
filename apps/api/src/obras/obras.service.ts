import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EstatusObra, Prisma, Rol, Usuario } from '@prisma/client';
import { rowsToCsv } from '../common/csv.util';
import { buildFolio, nextFolioSequence } from '../common/folio.util';
import { ScopeService } from '../common/scope.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateObraDto, UpdateObraDto } from './dto/obra.dto';

@Injectable()
export class ObrasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  private mapObra(obra: Prisma.ObraGetPayload<{ include: { municipio: true; contratista: true } }>) {
    const montoContratado = Number(obra.montoContratado);
    const montoEjercido = Number(obra.montoEjercido);
    const montoEjercidoExcedeContratado =
      montoContratado > 0 && montoEjercido > montoContratado;
    return {
      id: obra.id,
      folio: obra.folio,
      nombre: obra.nombre,
      municipio_id: obra.municipioId,
      contratista_id: obra.contratistaId,
      localidad: obra.localidad,
      programa: obra.programa,
      tipo_programa: obra.tipoPrograma,
      dependencia: obra.dependencia,
      tipo_obra: obra.tipoObra,
      descripcion: obra.descripcion ?? '',
      poblacion_beneficiada: obra.poblacionBeneficiada,
      monto_autorizado: Number(obra.montoAutorizado),
      monto_contratado: montoContratado,
      monto_ejercido: montoEjercido,
      monto_ejercido_excede_contratado: montoEjercidoExcedeContratado,
      desviacion_financiera_monto: montoEjercidoExcedeContratado
        ? Math.round((montoEjercido - montoContratado) * 100) / 100
        : 0,
      supervisor: obra.supervisor ?? '',
      fecha_inicio: obra.fechaInicio ?? '',
      fecha_termino_programada: obra.fechaTerminoProgramada ?? '',
      fecha_termino_real: obra.fechaTerminoReal ?? '',
      plazo_ejecucion: obra.plazoEjecucion,
      avance_fisico_programado: Number(obra.avanceFisicoProgramado),
      avance_fisico_real: Number(obra.avanceFisicoReal),
      avance_financiero: Number(obra.avanceFinanciero),
      estatus: obra.estatus,
      riesgo: obra.riesgo,
      latitud: obra.latitud ? Number(obra.latitud) : null,
      longitud: obra.longitud ? Number(obra.longitud) : null,
      evidencia_fotografica: JSON.stringify(obra.evidenciaFotografica ?? []),
      created_at: obra.createdAt,
      municipio_nombre: obra.municipio?.nombre ?? '',
      contratista_nombre: obra.contratista?.nombre ?? '',
    };
  }

  async findAll(
    user: Usuario,
    filters: {
      estatus?: string;
      programa?: string;
      municipio_id?: string;
      contratista_id?: string;
      search?: string;
    },
  ) {
    const where: Prisma.ObraWhereInput = { ...this.scope.obraWhere(user) };
    if (filters.estatus) where.estatus = filters.estatus as EstatusObra;
    if (filters.programa) where.programa = filters.programa;
    if (filters.municipio_id && user.rol === Rol.estatal) where.municipioId = filters.municipio_id;
    if (filters.contratista_id && user.rol !== Rol.contratista) {
      where.contratistaId = filters.contratista_id;
    }
    if (filters.search) {
      where.OR = [
        { folio: { contains: filters.search, mode: 'insensitive' } },
        { nombre: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    const obras = await this.prisma.obra.findMany({
      where,
      include: { municipio: true, contratista: true },
      orderBy: { folio: 'asc' },
    });
    return obras.map((o) => this.mapObra(o));
  }

  async findOne(id: string, user: Usuario) {
    const obra = await this.prisma.obra.findUnique({
      where: { id },
      include: { municipio: true, contratista: true },
    });
    if (!obra) throw new NotFoundException('Obra not found');
    this.scope.assertObraAccess(obra, user);
    return this.mapObra(obra);
  }

  private async resolveFolioForCreate(dto: CreateObraDto): Promise<string> {
    const trimmed = dto.folio?.trim();
    if (trimmed) return trimmed;

    const year = new Date().getFullYear();
    const prog = dto.programa.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const prefix = `${prog}-${year}-`;
    const existing = await this.prisma.obra.findMany({
      where: { folio: { startsWith: prefix, mode: 'insensitive' } },
      select: { folio: true },
    });
    const sequence = nextFolioSequence(
      existing.map((o) => o.folio),
      dto.programa,
      year,
    );
    return buildFolio(dto.programa, year, sequence);
  }

  async create(dto: CreateObraDto, user: Usuario) {
    if (user.rol === Rol.contratista) {
      throw new ForbiddenException('Contratistas cannot create obras');
    }
    const municipioId =
      user.rol === Rol.municipal && user.municipioId ? user.municipioId : dto.municipio_id;
    const folio = await this.resolveFolioForCreate(dto);
    const obra = await this.prisma.obra.create({
      data: {
        folio,
        nombre: dto.nombre,
        localidad: dto.localidad,
        programa: dto.programa,
        tipoPrograma: dto.tipo_programa ?? 'federal',
        dependencia: dto.dependencia,
        tipoObra: dto.tipo_obra,
        descripcion: dto.descripcion,
        poblacionBeneficiada: dto.poblacion_beneficiada ?? 0,
        montoAutorizado: dto.monto_autorizado,
        montoContratado: dto.monto_contratado ?? 0,
        montoEjercido: dto.monto_ejercido ?? 0,
        supervisor: dto.supervisor,
        fechaInicio: dto.fecha_inicio,
        fechaTerminoProgramada: dto.fecha_termino_programada,
        plazoEjecucion: dto.plazo_ejecucion ?? 0,
        avanceFisicoProgramado: dto.avance_fisico_programado ?? 0,
        avanceFisicoReal: dto.avance_fisico_real ?? 0,
        avanceFinanciero: dto.avance_financiero ?? 0,
        estatus: dto.estatus ?? EstatusObra.en_preparacion,
        riesgo: dto.riesgo ?? 'bajo',
        latitud: dto.latitud,
        longitud: dto.longitud,
        municipioId,
        contratistaId: dto.contratista_id,
      },
      include: { municipio: true, contratista: true },
    });
    return this.mapObra(obra);
  }

  async update(id: string, dto: UpdateObraDto, user: Usuario) {
    await this.scope.getObraOrThrow(id, user);
    const obra = await this.prisma.obra.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        localidad: dto.localidad,
        programa: dto.programa,
        dependencia: dto.dependencia,
        tipoObra: dto.tipo_obra,
        descripcion: dto.descripcion,
        montoAutorizado: dto.monto_autorizado,
        montoContratado: dto.monto_contratado,
        montoEjercido: dto.monto_ejercido,
        supervisor: dto.supervisor,
        avanceFisicoProgramado: dto.avance_fisico_programado,
        avanceFisicoReal: dto.avance_fisico_real,
        avanceFinanciero: dto.avance_financiero,
        estatus: dto.estatus,
        riesgo: dto.riesgo,
        contratistaId: dto.contratista_id,
      },
      include: { municipio: true, contratista: true },
    });
    return this.mapObra(obra);
  }

  async remove(id: string, user: Usuario) {
    if (user.rol !== Rol.estatal) throw new ForbiddenException('Only estatal can delete obras');
    await this.prisma.obra.delete({ where: { id } });
    return { deleted: true };
  }

  async exportCsv(
    user: Usuario,
    filters: {
      estatus?: string;
      programa?: string;
      municipio_id?: string;
      contratista_id?: string;
      search?: string;
    },
  ): Promise<string> {
    const obras = await this.findAll(user, filters);
    const rows = obras.map((o) => ({
      folio: o.folio,
      nombre: o.nombre,
      municipio: o.municipio_nombre,
      contratista: o.contratista_nombre,
      programa: o.programa,
      estatus: o.estatus,
      monto_autorizado: o.monto_autorizado,
      monto_contratado: o.monto_contratado,
      monto_ejercido: o.monto_ejercido,
      avance_fisico_real: o.avance_fisico_real,
      avance_fisico_programado: o.avance_fisico_programado,
      avance_financiero: o.avance_financiero,
      latitud: o.latitud ?? '',
      longitud: o.longitud ?? '',
    }));
    return rowsToCsv(rows);
  }
}
