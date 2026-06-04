import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EstatusAvance, Rol, Usuario } from '@prisma/client';
import { ScopeService } from '../common/scope.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AvancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  private map(a: {
    id: string;
    periodo: string;
    programado: unknown;
    reportado: unknown;
    validado: unknown;
    variacion: unknown;
    estatus: EstatusAvance;
    actividades: string;
    comentarios: string;
  }) {
    return {
      id: a.id,
      periodo: a.periodo,
      programado: Number(a.programado),
      reportado: Number(a.reportado),
      validado: a.validado != null ? Number(a.validado) : null,
      variacion: Number(a.variacion),
      estatus: a.estatus,
      actividades: a.actividades,
      comentarios: a.comentarios,
    };
  }

  async listByObra(obraId: string, user: Usuario) {
    await this.scope.getObraOrThrow(obraId, user);
    const avances = await this.prisma.avanceMensual.findMany({
      where: { obraId },
      orderBy: { periodo: 'asc' },
    });
    return avances.map((a) => this.map(a));
  }

  async create(
    obraId: string,
    data: {
      periodo: string;
      programado: number;
      reportado: number;
      validado?: number;
      variacion?: number;
      estatus?: EstatusAvance;
      actividades?: string;
      comentarios?: string;
    },
    user: Usuario,
  ) {
    await this.scope.getObraOrThrow(obraId, user);
    const avance = await this.prisma.avanceMensual.create({
      data: {
        obraId,
        periodo: data.periodo,
        programado: data.programado,
        reportado: data.reportado,
        validado: data.validado,
        variacion: data.variacion ?? 0,
        estatus: data.estatus ?? EstatusAvance.pendiente,
        actividades: data.actividades ?? '',
        comentarios: data.comentarios ?? '',
      },
    });
    await this.prisma.obra.update({
      where: { id: obraId },
      data: {
        avanceFisicoReal: data.reportado,
        avanceFinanciero: data.reportado * 0.95,
      },
    });
    return this.map(avance);
  }

  async validate(
    avanceId: string,
    data: { validado?: number; comentarios?: string },
    user: Usuario,
  ) {
    if (user.rol === Rol.contratista) {
      throw new ForbiddenException('Contratistas cannot validate avances');
    }
    const avance = await this.prisma.avanceMensual.findUnique({ where: { id: avanceId } });
    if (!avance) throw new NotFoundException('Avance not found');
    await this.scope.getObraOrThrow(avance.obraId, user);
    const validado = data.validado ?? 0;
    const updated = await this.prisma.avanceMensual.update({
      where: { id: avanceId },
      data: {
        validado,
        estatus: validado ? EstatusAvance.validado : EstatusAvance.observado,
        variacion: validado - Number(avance.reportado),
        comentarios: data.comentarios ?? avance.comentarios,
      },
    });
    return this.map(updated);
  }
}
