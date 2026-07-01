import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EstatusEstimacion, Rol, Usuario } from '@prisma/client';
import { ScopeService } from '../common/scope.service';
import { PrismaService } from '../prisma/prisma.service';

const APPROVED_STATUSES: EstatusEstimacion[] = [
  EstatusEstimacion.autorizada,
  EstatusEstimacion.pagada,
];

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

  private async sumApprovedMontoEjercido(
    obraId: string,
    includeEstimacionId?: string,
  ): Promise<number> {
    const approved = await this.prisma.estimacion.findMany({
      where: {
        accionId: obraId,
        validacionEstatal: true,
        estatus: { in: APPROVED_STATUSES },
        ...(includeEstimacionId ? { id: { not: includeEstimacionId } } : {}),
      },
      select: { montoEstimado: true },
    });
    let total = approved.reduce((s, e) => s + Number(e.montoEstimado), 0);
    if (includeEstimacionId) {
      const pending = await this.prisma.estimacion.findUnique({
        where: { id: includeEstimacionId },
      });
      if (pending) total += Number(pending.montoEstimado);
    }
    return total;
  }

  private async syncMontoEjercidoFromEstimaciones(obraId: string): Promise<void> {
    const total = await this.sumApprovedMontoEjercido(obraId);
    const obra = await this.prisma.accion.findUnique({ where: { id: obraId } });
    if (!obra) return;

    const montoContratado = Number(obra.montoContratado);
    const avanceFinanciero =
      montoContratado > 0 ? Math.round((total / montoContratado) * 10000) / 100 : 0;

    await this.prisma.accion.update({
      where: { id: obraId },
      data: { montoEjercido: total, avanceFinanciero },
    });

    if (montoContratado > 0 && total > montoContratado) {
      const existing = await this.prisma.alerta.findFirst({
        where: { accionId: obraId, tipo: 'desvio_financiero', atendida: false },
      });
      if (!existing) {
        await this.prisma.alerta.create({
          data: {
            accionId: obraId,
            municipio: (await this.prisma.municipio.findUnique({ where: { id: obra.municipioId } }))
              ?.nombre ?? obra.municipioId,
            municipioId: obra.municipioId,
            titulo: `Monto ejercido excede contrato: ${obra.folio}`,
            descripcion:
              `Monto ejercido $${total.toLocaleString('es-MX')} supera monto contratado ` +
              `$${montoContratado.toLocaleString('es-MX')} tras autorización de estimación.`,
            tipo: 'desvio_financiero',
            severidad: 'critica',
            fechaGeneracion: new Date().toISOString().slice(0, 10),
            atendida: false,
          },
        });
      }
    }
  }

  async listByObra(obraId: string, user: Usuario) {
    await this.scope.getObraOrThrow(obraId, user);
    const rows = await this.prisma.estimacion.findMany({
      where: { accionId: obraId },
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
        accionId: obraId,
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
    const obra = await this.scope.getObraOrThrow(est.accionId, user);
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

    if (aprobar) {
      const projected = await this.sumApprovedMontoEjercido(est.accionId, id);
      const montoContratado = Number(obra.montoContratado);
      if (montoContratado > 0 && projected > montoContratado) {
        throw new BadRequestException(
          `La autorización excedería el monto contratado ($${montoContratado.toLocaleString('es-MX')}). ` +
            `Monto ejercido proyectado: $${projected.toLocaleString('es-MX')}.`,
        );
      }
    }

    const updated = await this.prisma.estimacion.update({
      where: { id },
      data: {
        validacionEstatal: aprobar,
        estatus: aprobar ? EstatusEstimacion.autorizada : EstatusEstimacion.observada_estado,
        fechaAutorizacion: aprobar ? new Date().toISOString().slice(0, 10) : null,
      },
    });

    if (aprobar) {
      await this.syncMontoEjercidoFromEstimaciones(est.accionId);
    }

    return this.map(updated);
  }
}
