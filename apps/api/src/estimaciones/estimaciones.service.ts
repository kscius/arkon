import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EstatusEstimacion, Rol, Usuario } from '@prisma/client';
import { ScopeService } from '../common/scope.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EstimacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  private map(e: {
    id: string;
    numero: number;
    periodo: string;
    montoEstimado: unknown;
    montoAcumulado: unknown;
    porcentajeFinanciero: unknown;
    estatus: EstatusEstimacion;
    fechaPresentacion: string | null;
    fechaRevision: string | null;
    fechaAutorizacion: string | null;
    validacionMunicipal: boolean;
    validacionEstatal: boolean;
    observaciones: string;
  }) {
    return {
      id: e.id,
      numero: e.numero,
      periodo: e.periodo,
      monto_estimado: Number(e.montoEstimado),
      monto_acumulado: Number(e.montoAcumulado),
      porcentaje_financiero: Number(e.porcentajeFinanciero),
      estatus: e.estatus,
      fecha_presentacion: e.fechaPresentacion,
      fecha_revision: e.fechaRevision,
      fecha_autorizacion: e.fechaAutorizacion,
      validacion_municipal: e.validacionMunicipal,
      validacion_estatal: e.validacionEstatal,
      observaciones: e.observaciones,
    };
  }

  async listByObra(obraId: string, user: Usuario) {
    await this.scope.getObraOrThrow(obraId, user);
    const rows = await this.prisma.estimacion.findMany({
      where: { obraId },
      orderBy: { numero: 'asc' },
    });
    return rows.map((e) => this.map(e));
  }

  async create(obraId: string, data: Record<string, unknown>, user: Usuario) {
    const obra = await this.scope.getObraOrThrow(obraId, user);
    if (user.rol === Rol.contratista && obra.contratistaId !== user.contratistaId) {
      throw new ForbiddenException();
    }
    const e = await this.prisma.estimacion.create({
      data: {
        obraId,
        numero: Number(data.numero),
        periodo: String(data.periodo),
        montoEstimado: Number(data.monto_estimado),
        montoAcumulado: Number(data.monto_acumulado),
        porcentajeFinanciero: Number(data.porcentaje_financiero),
        estatus: EstatusEstimacion.presentada,
        fechaPresentacion: data.fecha_presentacion as string | undefined,
      },
    });
    return this.map(e);
  }

  async validate(
    id: string,
    nivel: 'municipal' | 'estatal',
    aprobar: boolean,
    user: Usuario,
  ) {
    const est = await this.prisma.estimacion.findUnique({ where: { id } });
    if (!est) throw new NotFoundException();
    await this.scope.getObraOrThrow(est.obraId, user);
    if (user.rol === Rol.contratista) throw new ForbiddenException();

    if (nivel === 'municipal') {
      const updated = await this.prisma.estimacion.update({
        where: { id },
        data: {
          validacionMunicipal: aprobar,
          estatus: aprobar ? EstatusEstimacion.validada_municipio : EstatusEstimacion.observada_municipio,
        },
      });
      return this.map(updated);
    }

    if (user.rol !== Rol.estatal) throw new ForbiddenException('Estatal only');
    const current = await this.prisma.estimacion.findUnique({ where: { id } });
    if (!current?.validacionMunicipal) {
      throw new BadRequestException('Municipal validation required first');
    }
    const updated = await this.prisma.estimacion.update({
      where: { id },
      data: {
        validacionEstatal: aprobar,
        estatus: aprobar ? EstatusEstimacion.autorizada : EstatusEstimacion.observada_estado,
        fechaAutorizacion: aprobar ? new Date().toISOString().slice(0, 10) : null,
      },
    });
    return this.map(updated);
  }
}
