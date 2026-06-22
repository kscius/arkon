import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EstatusAvance, Rol, Usuario } from '@prisma/client';
import { ScopeService } from '../common/scope.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AvancesTrimestralesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  private map(a: {
    id: string;
    obraId: string;
    ejercicioFiscal: number;
    trimestre: number;
    avanceFisicoAnterior: unknown;
    avanceFisicoTrimestre: unknown;
    avanceFisicoAcumulado: unknown;
    avanceFinAnterior: unknown;
    avanceFinTrimestre: unknown;
    avanceFinAcumulado: unknown;
    fechaEntrega: string | null;
    estatus: EstatusAvance;
    observaciones: string;
  }) {
    return {
      id: a.id,
      obra_id: a.obraId,
      ejercicio_fiscal: a.ejercicioFiscal,
      trimestre: a.trimestre,
      avance_fisico_anterior: Number(a.avanceFisicoAnterior),
      avance_fisico_trimestre: Number(a.avanceFisicoTrimestre),
      avance_fisico_acumulado: Number(a.avanceFisicoAcumulado),
      avance_fin_anterior: Number(a.avanceFinAnterior),
      avance_fin_trimestre: Number(a.avanceFinTrimestre),
      avance_fin_acumulado: Number(a.avanceFinAcumulado),
      fecha_entrega: a.fechaEntrega,
      estatus: a.estatus,
      observaciones: a.observaciones,
    };
  }

  async listByObra(obraId: string, user: Usuario) {
    await this.scope.getObraOrThrow(obraId, user);
    const items = await this.prisma.avanceTrimestral.findMany({
      where: { obraId },
      orderBy: [{ ejercicioFiscal: 'asc' }, { trimestre: 'asc' }],
    });
    return items.map((a) => this.map(a));
  }

  async create(
    obraId: string,
    data: {
      ejercicio_fiscal: number;
      trimestre: number;
      avance_fisico_anterior?: number;
      avance_fisico_trimestre?: number;
      avance_fisico_acumulado?: number;
      avance_fin_anterior?: number;
      avance_fin_trimestre?: number;
      avance_fin_acumulado?: number;
      fecha_entrega?: string;
      estatus?: EstatusAvance;
      observaciones?: string;
    },
    user: Usuario,
  ) {
    await this.scope.getObraOrThrow(obraId, user);
    const a = await this.prisma.avanceTrimestral.create({
      data: {
        obraId,
        ejercicioFiscal: data.ejercicio_fiscal,
        trimestre: data.trimestre,
        avanceFisicoAnterior: data.avance_fisico_anterior ?? 0,
        avanceFisicoTrimestre: data.avance_fisico_trimestre ?? 0,
        avanceFisicoAcumulado: data.avance_fisico_acumulado ?? 0,
        avanceFinAnterior: data.avance_fin_anterior ?? 0,
        avanceFinTrimestre: data.avance_fin_trimestre ?? 0,
        avanceFinAcumulado: data.avance_fin_acumulado ?? 0,
        fechaEntrega: data.fecha_entrega,
        estatus: data.estatus ?? EstatusAvance.pendiente,
        observaciones: data.observaciones ?? '',
      },
    });
    return this.map(a);
  }

  async update(
    obraId: string,
    id: string,
    data: Record<string, unknown>,
    user: Usuario,
  ) {
    await this.scope.getObraOrThrow(obraId, user);
    const existing = await this.prisma.avanceTrimestral.findFirst({ where: { id, obraId } });
    if (!existing) throw new NotFoundException('Avance trimestral not found');
    if (user.rol === Rol.contratista && data.estatus) {
      throw new ForbiddenException('Contratistas cannot change estatus');
    }
    const a = await this.prisma.avanceTrimestral.update({
      where: { id },
      data: {
        ejercicioFiscal: data.ejercicio_fiscal as number | undefined,
        trimestre: data.trimestre as number | undefined,
        avanceFisicoAnterior: data.avance_fisico_anterior as number | undefined,
        avanceFisicoTrimestre: data.avance_fisico_trimestre as number | undefined,
        avanceFisicoAcumulado: data.avance_fisico_acumulado as number | undefined,
        avanceFinAnterior: data.avance_fin_anterior as number | undefined,
        avanceFinTrimestre: data.avance_fin_trimestre as number | undefined,
        avanceFinAcumulado: data.avance_fin_acumulado as number | undefined,
        fechaEntrega: data.fecha_entrega as string | undefined,
        estatus: data.estatus as EstatusAvance | undefined,
        observaciones: data.observaciones as string | undefined,
      },
    });
    return this.map(a);
  }

  async remove(obraId: string, id: string, user: Usuario) {
    if (user.rol === Rol.contratista) throw new ForbiddenException();
    await this.scope.getObraOrThrow(obraId, user);
    const existing = await this.prisma.avanceTrimestral.findFirst({ where: { id, obraId } });
    if (!existing) throw new NotFoundException('Avance trimestral not found');
    await this.prisma.avanceTrimestral.delete({ where: { id } });
    return { deleted: true };
  }
}
