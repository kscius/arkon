import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Rol, Usuario } from '@prisma/client';
import { ScopeService } from '../common/scope.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateObraFisicaDto, UpdateObraFisicaDto } from './dto/obra-fisica.dto';

const OBRA_FISICA_INCLUDE = {
  municipio: true,
  entidadFederativa: true,
  organismoOperador: true,
  acciones: {
    include: { contratista: true, score: true },
    orderBy: { createdAt: 'desc' as const },
  },
} as const;

type ObraFisicaPayload = Prisma.ObraGetPayload<{ include: typeof OBRA_FISICA_INCLUDE }>;

@Injectable()
export class ObrasFisicasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  private mapObraFisica(obra: ObraFisicaPayload) {
    const acciones = obra.acciones ?? [];
    const montoAutorizado = acciones.reduce((s, a) => s + Number(a.montoAutorizado), 0);
    const montoEjercido = acciones.reduce((s, a) => s + Number(a.montoEjercido), 0);
    const avanceProm =
      acciones.length > 0
        ? acciones.reduce((s, a) => s + Number(a.avanceFisicoReal), 0) / acciones.length
        : 0;

    return {
      id: obra.id,
      clave: obra.clave,
      nombre: obra.nombre,
      descripcion: obra.descripcion ?? '',
      tipo_obra: obra.tipoObra,
      localidad: obra.localidad,
      tipo_localidad: obra.tipoLocalidad,
      latitud: obra.latitud != null ? Number(obra.latitud) : null,
      longitud: obra.longitud != null ? Number(obra.longitud) : null,
      poblacion_beneficiada: obra.poblacionBeneficiada,
      cobertura_ap_antes: obra.coberturaApAntes != null ? Number(obra.coberturaApAntes) : null,
      cobertura_ap_meta: obra.coberturaApMeta != null ? Number(obra.coberturaApMeta) : null,
      cobertura_tar_antes: obra.coberturaTarAntes != null ? Number(obra.coberturaTarAntes) : null,
      cobertura_tar_meta: obra.coberturaTarMeta != null ? Number(obra.coberturaTarMeta) : null,
      caudal_lps: obra.caudalLps != null ? Number(obra.caudalLps) : null,
      pob_incorporar: obra.pobIncorporar,
      pob_mejorar: obra.pobMejorar,
      pob_mujeres: obra.pobMujeres,
      pob_indigena: obra.pobIndigena,
      pob_afromexicano: obra.pobAfromexicano,
      evidencia_fotografica: JSON.stringify(obra.evidenciaFotografica ?? []),
      estatus_fisico: obra.estatusFisico,
      municipio_id: obra.municipioId,
      municipio_nombre: obra.municipio?.nombre ?? '',
      entidad_federativa_id: obra.entidadFederativaId,
      entidad_federativa_nombre: obra.entidadFederativa?.nombre ?? '',
      organismo_operador_id: obra.organismoOperadorId,
      organismo_operador_nombre: obra.organismoOperador?.nombre ?? '',
      acciones_count: acciones.length,
      monto_autorizado_total: montoAutorizado,
      monto_ejercido_total: montoEjercido,
      avance_fisico_promedio: Math.round(avanceProm * 100) / 100,
      programas: [...new Set(acciones.map((a) => a.programa))],
      created_at: obra.createdAt,
    };
  }

  private mapAccionSummary(a: ObraFisicaPayload['acciones'][number]) {
    return {
      id: a.id,
      folio: a.folio,
      nombre: a.nombre,
      programa: a.programa,
      cua: a.cua,
      estatus: a.estatus,
      monto_autorizado: Number(a.montoAutorizado),
      monto_ejercido: Number(a.montoEjercido),
      avance_fisico_real: Number(a.avanceFisicoReal),
      avance_financiero: Number(a.avanceFinanciero),
      contratista_nombre: a.contratista?.nombre ?? '',
      riesgo_nivel: a.score?.riesgoNivel ?? null,
    };
  }

  async findAll(
    user: Usuario,
    filters: {
      estatus_fisico?: string;
      municipio_id?: string;
      search?: string;
    },
  ) {
    const where: Prisma.ObraWhereInput = {
      ...this.scope.obraFisicaWhere(user),
      ...(filters.estatus_fisico && { estatusFisico: filters.estatus_fisico as never }),
      ...(filters.municipio_id && { municipioId: filters.municipio_id }),
      ...(filters.search && {
        OR: [
          { nombre: { contains: filters.search, mode: 'insensitive' } },
          { clave: { contains: filters.search, mode: 'insensitive' } },
          { localidad: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };
    const rows = await this.prisma.obra.findMany({
      where,
      include: OBRA_FISICA_INCLUDE,
      orderBy: { nombre: 'asc' },
    });
    return rows.map((o) => this.mapObraFisica(o));
  }

  async findOne(id: string, user: Usuario) {
    const obra = await this.scope.getObraFisicaOrThrow(id, user);
    const full = await this.prisma.obra.findUniqueOrThrow({
      where: { id: obra.id },
      include: OBRA_FISICA_INCLUDE,
    });
    return {
      ...this.mapObraFisica(full),
      acciones: full.acciones.map((a) => this.mapAccionSummary(a)),
    };
  }

  async listAcciones(id: string, user: Usuario) {
    await this.scope.getObraFisicaOrThrow(id, user);
    const acciones = await this.prisma.accion.findMany({
      where: { obraFisicaId: id, ...this.scope.obraWhere(user) },
      include: { contratista: true, score: true },
      orderBy: { createdAt: 'desc' },
    });
    return acciones.map((a) => this.mapAccionSummary(a));
  }

  async create(dto: CreateObraFisicaDto, user: Usuario) {
    if (user.rol === Rol.contratista) {
      throw new ForbiddenException('Contratistas cannot create obras');
    }
    const clave = dto.clave?.trim() || `OBRA-${Date.now()}`;
    const created = await this.prisma.obra.create({
      data: {
        clave,
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        tipoObra: dto.tipo_obra,
        localidad: dto.localidad,
        tipoLocalidad: dto.tipo_localidad,
        latitud: dto.latitud,
        longitud: dto.longitud,
        poblacionBeneficiada: dto.poblacion_beneficiada ?? 0,
        coberturaApAntes: dto.cobertura_ap_antes,
        coberturaApMeta: dto.cobertura_ap_meta,
        coberturaTarAntes: dto.cobertura_tar_antes,
        coberturaTarMeta: dto.cobertura_tar_meta,
        caudalLps: dto.caudal_lps,
        pobIncorporar: dto.pob_incorporar,
        pobMejorar: dto.pob_mejorar,
        pobMujeres: dto.pob_mujeres,
        pobIndigena: dto.pob_indigena,
        pobAfromexicano: dto.pob_afromexicano,
        estatusFisico: dto.estatus_fisico,
        municipioId: dto.municipio_id,
        entidadFederativaId: dto.entidad_federativa_id,
        organismoOperadorId: dto.organismo_operador_id,
      },
      include: OBRA_FISICA_INCLUDE,
    });
    return this.mapObraFisica(created);
  }

  async update(id: string, dto: UpdateObraFisicaDto, user: Usuario) {
    await this.scope.getObraFisicaOrThrow(id, user);
    if (user.rol === Rol.contratista) {
      throw new ForbiddenException('Contratistas cannot update obras');
    }
    const updated = await this.prisma.obra.update({
      where: { id },
      data: {
        ...(dto.clave !== undefined && { clave: dto.clave }),
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
        ...(dto.tipo_obra !== undefined && { tipoObra: dto.tipo_obra }),
        ...(dto.localidad !== undefined && { localidad: dto.localidad }),
        ...(dto.tipo_localidad !== undefined && { tipoLocalidad: dto.tipo_localidad }),
        ...(dto.latitud !== undefined && { latitud: dto.latitud }),
        ...(dto.longitud !== undefined && { longitud: dto.longitud }),
        ...(dto.poblacion_beneficiada !== undefined && {
          poblacionBeneficiada: dto.poblacion_beneficiada,
        }),
        ...(dto.cobertura_ap_antes !== undefined && { coberturaApAntes: dto.cobertura_ap_antes }),
        ...(dto.cobertura_ap_meta !== undefined && { coberturaApMeta: dto.cobertura_ap_meta }),
        ...(dto.cobertura_tar_antes !== undefined && {
          coberturaTarAntes: dto.cobertura_tar_antes,
        }),
        ...(dto.cobertura_tar_meta !== undefined && { coberturaTarMeta: dto.cobertura_tar_meta }),
        ...(dto.caudal_lps !== undefined && { caudalLps: dto.caudal_lps }),
        ...(dto.pob_incorporar !== undefined && { pobIncorporar: dto.pob_incorporar }),
        ...(dto.pob_mejorar !== undefined && { pobMejorar: dto.pob_mejorar }),
        ...(dto.pob_mujeres !== undefined && { pobMujeres: dto.pob_mujeres }),
        ...(dto.pob_indigena !== undefined && { pobIndigena: dto.pob_indigena }),
        ...(dto.pob_afromexicano !== undefined && { pobAfromexicano: dto.pob_afromexicano }),
        ...(dto.estatus_fisico !== undefined && { estatusFisico: dto.estatus_fisico }),
        ...(dto.municipio_id !== undefined && { municipioId: dto.municipio_id }),
        ...(dto.entidad_federativa_id !== undefined && {
          entidadFederativaId: dto.entidad_federativa_id,
        }),
        ...(dto.organismo_operador_id !== undefined && {
          organismoOperadorId: dto.organismo_operador_id,
        }),
      },
      include: OBRA_FISICA_INCLUDE,
    });
    return this.mapObraFisica(updated);
  }

  async remove(id: string, user: Usuario) {
    await this.scope.getObraFisicaOrThrow(id, user);
    if (user.rol !== Rol.estatal) {
      throw new ForbiddenException('Only estatal can delete obras');
    }
    const linked = await this.prisma.accion.count({ where: { obraFisicaId: id } });
    if (linked > 0) {
      throw new ForbiddenException('Cannot delete obra with linked acciones');
    }
    await this.prisma.obra.delete({ where: { id } });
    return { deleted: true };
  }
}
