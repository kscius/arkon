import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EstatusAccion, Prisma, Rol, Usuario } from '@prisma/client';
import { rowsToCsv } from '../common/csv.util';
import { buildFolio, nextFolioSequence } from '../common/folio.util';
import { ScopeService } from '../common/scope.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateObraDto, UpdateObraDto } from './dto/obra.dto';

const OBRA_INCLUDE = {
  municipio: true,
  contratista: true,
  entidadFederativa: true,
  organismoOperador: true,
  accionPrograma: true,
  cofinanciamientos: true,
  obraFisica: { include: { municipio: true } },
} as const;

type ObraPayload = Prisma.AccionGetPayload<{ include: typeof OBRA_INCLUDE }>;

@Injectable()
export class ObrasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  private mapObra(obra: ObraPayload) {
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
      tipo_obra: obra.tipoAccion,
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
      cua: obra.cua,
      id_sisba: obra.idSisba,
      num_contrato: obra.numContrato,
      compras_mx_folio: obra.comprasMxFolio,
      tipo_adjudicacion: obra.tipoAdjudicacion,
      fecha_fallo: obra.fechaFallo,
      tipo_localidad: obra.tipoLocalidad,
      subcomponente: obra.subcomponente,
      accion_programa_id: obra.accionProgramaId,
      accion_programa_clave: obra.accionPrograma?.clave ?? null,
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
      entidad_federativa_id: obra.entidadFederativaId,
      entidad_federativa_nombre: obra.entidadFederativa?.nombre ?? '',
      organismo_operador_id: obra.organismoOperadorId,
      organismo_operador_nombre: obra.organismoOperador?.nombre ?? '',
      anexo_tecnico_id: obra.anexoTecnicoId,
      obra_fisica_id: obra.obraFisicaId,
      obra_fisica: obra.obraFisica
        ? {
            id: obra.obraFisica.id,
            clave: obra.obraFisica.clave,
            nombre: obra.obraFisica.nombre,
            estatus_fisico: obra.obraFisica.estatusFisico,
            municipio_nombre: obra.obraFisica.municipio?.nombre ?? '',
            latitud: obra.obraFisica.latitud != null ? Number(obra.obraFisica.latitud) : null,
            longitud: obra.obraFisica.longitud != null ? Number(obra.obraFisica.longitud) : null,
          }
        : null,
      cofinanciamientos: obra.cofinanciamientos.map((c) => ({
        id: c.id,
        fuente: c.fuente,
        monto: Number(c.monto),
        porcentaje: Number(c.porcentaje),
        descripcion: c.descripcion,
      })),
    };
  }

  private proaguaFields(dto: CreateObraDto | UpdateObraDto) {
    return {
      ...(dto.cua !== undefined && { cua: dto.cua }),
      ...(dto.id_sisba !== undefined && { idSisba: dto.id_sisba }),
      ...(dto.num_contrato !== undefined && { numContrato: dto.num_contrato }),
      ...(dto.compras_mx_folio !== undefined && { comprasMxFolio: dto.compras_mx_folio }),
      ...(dto.tipo_adjudicacion !== undefined && { tipoAdjudicacion: dto.tipo_adjudicacion }),
      ...(dto.fecha_fallo !== undefined && { fechaFallo: dto.fecha_fallo }),
      ...(dto.tipo_localidad !== undefined && { tipoLocalidad: dto.tipo_localidad }),
      ...(dto.subcomponente !== undefined && { subcomponente: dto.subcomponente }),
      ...(dto.accion_programa_id !== undefined && { accionProgramaId: dto.accion_programa_id }),
      ...(dto.cobertura_ap_antes !== undefined && { coberturaApAntes: dto.cobertura_ap_antes }),
      ...(dto.cobertura_ap_meta !== undefined && { coberturaApMeta: dto.cobertura_ap_meta }),
      ...(dto.cobertura_tar_antes !== undefined && { coberturaTarAntes: dto.cobertura_tar_antes }),
      ...(dto.cobertura_tar_meta !== undefined && { coberturaTarMeta: dto.cobertura_tar_meta }),
      ...(dto.caudal_lps !== undefined && { caudalLps: dto.caudal_lps }),
      ...(dto.pob_incorporar !== undefined && { pobIncorporar: dto.pob_incorporar }),
      ...(dto.pob_mejorar !== undefined && { pobMejorar: dto.pob_mejorar }),
      ...(dto.pob_mujeres !== undefined && { pobMujeres: dto.pob_mujeres }),
      ...(dto.pob_indigena !== undefined && { pobIndigena: dto.pob_indigena }),
      ...(dto.pob_afromexicano !== undefined && { pobAfromexicano: dto.pob_afromexicano }),
      ...(dto.entidad_federativa_id !== undefined && { entidadFederativaId: dto.entidad_federativa_id }),
      ...(dto.organismo_operador_id !== undefined && { organismoOperadorId: dto.organismo_operador_id }),
      ...(dto.anexo_tecnico_id !== undefined && { anexoTecnicoId: dto.anexo_tecnico_id }),
      ...(dto.obra_fisica_id !== undefined && { obraFisicaId: dto.obra_fisica_id }),
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
    const where: Prisma.AccionWhereInput = { ...this.scope.obraWhere(user) };
    if (filters.estatus) where.estatus = filters.estatus as EstatusAccion;
    if (filters.programa) where.programa = filters.programa;
    if (filters.municipio_id && user.rol === Rol.estatal) where.municipioId = filters.municipio_id;
    if (filters.contratista_id && user.rol !== Rol.contratista) {
      where.contratistaId = filters.contratista_id;
    }
    if (filters.search) {
      where.OR = [
        { folio: { contains: filters.search, mode: 'insensitive' } },
        { nombre: { contains: filters.search, mode: 'insensitive' } },
        { cua: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    const obras = await this.prisma.accion.findMany({
      where,
      include: OBRA_INCLUDE,
      orderBy: { folio: 'asc' },
    });
    return obras.map((o) => this.mapObra(o));
  }

  async findOne(id: string, user: Usuario) {
    const obra = await this.prisma.accion.findUnique({
      where: { id },
      include: OBRA_INCLUDE,
    });
    if (!obra) throw new NotFoundException('Accion not found');
    this.scope.assertObraAccess(obra, user);
    return this.mapObra(obra);
  }

  private async resolveFolioForCreate(dto: CreateObraDto): Promise<string> {
    const trimmed = dto.folio?.trim();
    if (trimmed) return trimmed;

    const year = new Date().getFullYear();
    const prog = dto.programa.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const prefix = `${prog}-${year}-`;
    const existing = await this.prisma.accion.findMany({
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
      throw new ForbiddenException('Contratistas cannot create acciones');
    }
    const municipioId =
      user.rol === Rol.municipal && user.municipioId ? user.municipioId : dto.municipio_id;
    const folio = await this.resolveFolioForCreate(dto);
    const obra = await this.prisma.accion.create({
      data: {
        folio,
        nombre: dto.nombre,
        localidad: dto.localidad,
        programa: dto.programa,
        tipoPrograma: dto.tipo_programa ?? 'federal',
        dependencia: dto.dependencia,
        tipoAccion: dto.tipo_obra,
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
        estatus: dto.estatus ?? EstatusAccion.en_preparacion,
        riesgo: dto.riesgo ?? 'bajo',
        latitud: dto.latitud,
        longitud: dto.longitud,
        municipioId,
        contratistaId: dto.contratista_id,
        ...this.proaguaFields(dto),
      },
      include: OBRA_INCLUDE,
    });
    return this.mapObra(obra);
  }

  async update(id: string, dto: UpdateObraDto, user: Usuario) {
    await this.scope.getObraOrThrow(id, user);
    const obra = await this.prisma.accion.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        localidad: dto.localidad,
        programa: dto.programa,
        dependencia: dto.dependencia,
        tipoAccion: dto.tipo_obra,
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
        ...this.proaguaFields(dto),
      },
      include: OBRA_INCLUDE,
    });
    return this.mapObra(obra);
  }

  async remove(id: string, user: Usuario) {
    if (user.rol !== Rol.estatal) throw new ForbiddenException('Only estatal can delete acciones');
    await this.prisma.accion.delete({ where: { id } });
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
      cua: o.cua ?? '',
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
