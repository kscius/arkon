import { Injectable, NotFoundException } from '@nestjs/common';
import { EstatusObservacion, Usuario } from '@prisma/client';
import { ScopeService } from '../common/scope.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ObservacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  private map(o: {
    id: string;
    usuarioEmisor: string;
    fecha: string;
    tipo: string;
    descripcion: string;
    severidad: string;
    responsable: string | null;
    fechaCompromiso: string | null;
    estatus: EstatusObservacion;
    respuestasJson: unknown;
  }) {
    return {
      id: o.id,
      usuario_emisor: o.usuarioEmisor,
      fecha: o.fecha,
      tipo: o.tipo,
      descripcion: o.descripcion,
      severidad: o.severidad,
      responsable: o.responsable ?? '',
      fecha_compromiso: o.fechaCompromiso,
      estatus: o.estatus,
      respuestas_json: JSON.stringify(o.respuestasJson ?? []),
    };
  }

  async listByObra(obraId: string, user: Usuario) {
    await this.scope.getObraOrThrow(obraId, user);
    const rows = await this.prisma.observacion.findMany({ where: { obraId } });
    return rows.map((o) => this.map(o));
  }

  async create(
    obraId: string,
    data: {
      fecha: string;
      tipo: string;
      descripcion: string;
      severidad?: string;
      responsable?: string;
      fecha_compromiso?: string;
    },
    user: Usuario,
  ) {
    await this.scope.getObraOrThrow(obraId, user);
    const obs = await this.prisma.observacion.create({
      data: {
        obraId,
        usuarioEmisor: user.fullName,
        fecha: data.fecha,
        tipo: data.tipo,
        descripcion: data.descripcion,
        severidad: data.severidad ?? 'media',
        responsable: data.responsable,
        fechaCompromiso: data.fecha_compromiso,
        estatus: EstatusObservacion.abierta,
        respuestasJson: [],
      },
    });
    return this.map(obs);
  }

  async updateStatus(id: string, estatus: EstatusObservacion, user: Usuario) {
    const obs = await this.prisma.observacion.findUnique({ where: { id } });
    if (!obs) throw new NotFoundException('Observacion not found');
    await this.scope.getObraOrThrow(obs.obraId, user);
    const updated = await this.prisma.observacion.update({
      where: { id },
      data: { estatus },
    });
    return { status: 'success', estatus: updated.estatus };
  }
}
