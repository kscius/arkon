import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Rol, Usuario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CierresEjercicioService {
  constructor(private readonly prisma: PrismaService) {}

  private map(c: {
    id: string;
    anexoEjecucionId: string;
    ejercicioFiscal: number;
    tipoApoyo: string;
    montoTransferido: unknown;
    montoReintegradoEj: unknown;
    montoModificado31dic: unknown;
    montoInformeFinal: unknown;
    montoReintegrado15ene: unknown;
    montoPorReintegrar: unknown;
    fechaCierre: string | null;
    estatus: string;
    archivoUrl: string | null;
    anexoEjecucion?: { numero: string } | null;
  }) {
    return {
      id: c.id,
      anexo_ejecucion_id: c.anexoEjecucionId,
      ejercicio_fiscal: c.ejercicioFiscal,
      tipo_apoyo: c.tipoApoyo,
      monto_transferido: Number(c.montoTransferido),
      monto_reintegrado_ejercicio: Number(c.montoReintegradoEj),
      monto_modificado_31dic: Number(c.montoModificado31dic),
      monto_informe_final: Number(c.montoInformeFinal),
      monto_reintegrado_15ene: Number(c.montoReintegrado15ene),
      monto_por_reintegrar: Number(c.montoPorReintegrar),
      fecha_cierre: c.fechaCierre,
      estatus: c.estatus,
      archivo_url: c.archivoUrl,
      anexo_ejecucion_numero: c.anexoEjecucion?.numero ?? '',
    };
  }

  async findAll(_user: Usuario) {
    const list = await this.prisma.cierreEjercicio.findMany({
      include: { anexoEjecucion: true },
      orderBy: [{ ejercicioFiscal: 'desc' }, { tipoApoyo: 'asc' }],
    });
    return list.map((c) => this.map(c));
  }

  async findOne(id: string, _user: Usuario) {
    const c = await this.prisma.cierreEjercicio.findUnique({
      where: { id },
      include: { anexoEjecucion: true },
    });
    if (!c) throw new NotFoundException('Cierre de ejercicio not found');
    return this.map(c);
  }

  async create(
    data: {
      anexo_ejecucion_id: string;
      ejercicio_fiscal: number;
      tipo_apoyo: string;
      monto_transferido: number;
      monto_reintegrado_ejercicio?: number;
      monto_modificado_31dic?: number;
      monto_informe_final?: number;
      monto_reintegrado_15ene?: number;
      monto_por_reintegrar?: number;
      fecha_cierre?: string;
      estatus?: string;
      archivo_url?: string;
    },
    user: Usuario,
  ) {
    if (user.rol === Rol.contratista) throw new ForbiddenException();
    const c = await this.prisma.cierreEjercicio.create({
      data: {
        anexoEjecucionId: data.anexo_ejecucion_id,
        ejercicioFiscal: data.ejercicio_fiscal,
        tipoApoyo: data.tipo_apoyo,
        montoTransferido: data.monto_transferido,
        montoReintegradoEj: data.monto_reintegrado_ejercicio ?? 0,
        montoModificado31dic: data.monto_modificado_31dic ?? 0,
        montoInformeFinal: data.monto_informe_final ?? 0,
        montoReintegrado15ene: data.monto_reintegrado_15ene ?? 0,
        montoPorReintegrar: data.monto_por_reintegrar ?? 0,
        fechaCierre: data.fecha_cierre,
        estatus: data.estatus ?? 'pendiente',
        archivoUrl: data.archivo_url,
      },
      include: { anexoEjecucion: true },
    });
    return this.map(c);
  }

  async update(id: string, data: Record<string, unknown>, user: Usuario) {
    if (user.rol === Rol.contratista) throw new ForbiddenException();
    await this.findOne(id, user);
    const c = await this.prisma.cierreEjercicio.update({
      where: { id },
      data: {
        anexoEjecucionId: data.anexo_ejecucion_id as string | undefined,
        ejercicioFiscal: data.ejercicio_fiscal as number | undefined,
        tipoApoyo: data.tipo_apoyo as string | undefined,
        montoTransferido: data.monto_transferido as number | undefined,
        montoReintegradoEj: data.monto_reintegrado_ejercicio as number | undefined,
        montoModificado31dic: data.monto_modificado_31dic as number | undefined,
        montoInformeFinal: data.monto_informe_final as number | undefined,
        montoReintegrado15ene: data.monto_reintegrado_15ene as number | undefined,
        montoPorReintegrar: data.monto_por_reintegrar as number | undefined,
        fechaCierre: data.fecha_cierre as string | undefined,
        estatus: data.estatus as string | undefined,
        archivoUrl: data.archivo_url as string | undefined,
      },
      include: { anexoEjecucion: true },
    });
    return this.map(c);
  }

  async remove(id: string, user: Usuario) {
    if (user.rol !== Rol.estatal) throw new ForbiddenException('Only estatal');
    await this.findOne(id, user);
    await this.prisma.cierreEjercicio.delete({ where: { id } });
    return { deleted: true };
  }
}
