import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AlertaConfig, Prisma, Rol, Usuario } from '@prisma/client';
import { ScopeService } from '../common/scope.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AlertaConfigEvaluatorService,
  AlertaMatch,
} from './alerta-config-evaluator.service';
import { CreateAlertaConfigDto } from './dto/create-alerta-config.dto';
import { UpdateAlertaConfigDto } from './dto/update-alerta-config.dto';

type DestinatarioJson = { userId: string; nombre: string; telefono: string };

@Injectable()
export class AlertaConfigsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
    private readonly evaluator: AlertaConfigEvaluatorService,
  ) {}

  private configWhere(user: Usuario): Prisma.AlertaConfigWhereInput {
    if (user.rol === Rol.estatal) return {};
    if (user.rol === Rol.municipal && user.municipioId) {
      return {
        OR: [
          { municipioId: user.municipioId },
          { obra: { municipioId: user.municipioId } },
          { municipioId: null, obraId: null, creador: { municipioId: user.municipioId } },
        ],
      };
    }
    return { id: '00000000-0000-0000-0000-000000000000' };
  }

  private mapDestinatarios(raw: unknown): DestinatarioJson[] {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((d) => {
        const item = d as Record<string, string>;
        return {
          userId: String(item.userId ?? item.user_id ?? ''),
          nombre: String(item.nombre ?? ''),
          telefono: String(item.telefono ?? ''),
        };
      })
      .filter((d) => d.userId && d.telefono);
  }

  private map(config: AlertaConfig) {
    return {
      id: config.id,
      nombre: config.nombre,
      descripcion: config.descripcion,
      activa: config.activa,
      tipo: config.tipo,
      severidad: config.severidad,
      programa_filtro: config.programaFiltro,
      municipio_id: config.municipioId,
      obra_id: config.obraId,
      umbral_dias: config.umbralDias,
      umbral_porcentaje:
        config.umbralPorcentaje != null ? Number(config.umbralPorcentaje) : null,
      umbral_monto: config.umbralMonto != null ? Number(config.umbralMonto) : null,
      destinatarios: this.mapDestinatarios(config.destinatariosJson).map((d) => ({
        user_id: d.userId,
        nombre: d.nombre,
        telefono: d.telefono,
      })),
      creado_por: config.creadoPor,
      created_at: config.createdAt.toISOString(),
      updated_at: config.updatedAt.toISOString(),
    };
  }

  private toDestinatariosJson(
    destinatarios: CreateAlertaConfigDto['destinatarios'],
  ): DestinatarioJson[] {
    return destinatarios.map((d) => ({
      userId: d.user_id,
      nombre: d.nombre,
      telefono: d.telefono,
    }));
  }

  private assertScopeAccess(config: AlertaConfig, user: Usuario): void {
    if (user.rol === Rol.estatal) return;
    if (user.rol !== Rol.municipal || !user.municipioId) {
      throw new ForbiddenException('Access denied');
    }
    if (config.municipioId && config.municipioId !== user.municipioId) {
      throw new ForbiddenException('Access denied');
    }
    if (config.obraId) {
      // validated at create/update via getObraOrThrow
      return;
    }
  }

  private async validateScope(
    dto: {
      municipio_id?: string;
      obra_id?: string;
      programa_filtro?: string;
    },
    user: Usuario,
  ): Promise<void> {
    if (user.rol === Rol.municipal && user.municipioId) {
      if (dto.municipio_id && dto.municipio_id !== user.municipioId) {
        throw new ForbiddenException('Cannot create config for another municipio');
      }
      if (dto.obra_id) {
        const obra = await this.scope.getObraOrThrow(dto.obra_id, user);
        if (obra.municipioId !== user.municipioId) {
          throw new ForbiddenException('Obra not in your municipio');
        }
      }
      if (!dto.municipio_id && !dto.obra_id && dto.programa_filtro) {
        // municipal can filter by program within their scope implicitly
      }
    }
    if (dto.obra_id) {
      await this.scope.getObraOrThrow(dto.obra_id, user);
    }
    if (dto.municipio_id) {
      const mun = await this.prisma.municipio.findUnique({
        where: { id: dto.municipio_id },
      });
      if (!mun) throw new BadRequestException('municipio_id not found');
    }
  }

  async findAll(user: Usuario) {
    const configs = await this.prisma.alertaConfig.findMany({
      where: this.configWhere(user),
      orderBy: { createdAt: 'desc' },
    });
    return configs.map((c) => this.map(c));
  }

  async findOne(id: string, user: Usuario) {
    const config = await this.prisma.alertaConfig.findFirst({
      where: { id, ...this.configWhere(user) },
    });
    if (!config) throw new NotFoundException('Alerta config not found');
    return this.map(config);
  }

  async create(dto: CreateAlertaConfigDto, user: Usuario) {
    await this.validateScope(dto, user);
    const municipioId =
      user.rol === Rol.municipal && user.municipioId && !dto.obra_id
        ? dto.municipio_id ?? user.municipioId
        : dto.municipio_id;

    const created = await this.prisma.alertaConfig.create({
      data: {
        nombre: dto.nombre.trim(),
        descripcion: dto.descripcion?.trim() || null,
        activa: dto.activa ?? true,
        tipo: dto.tipo,
        severidad: dto.severidad ?? 'media',
        programaFiltro: dto.programa_filtro?.trim() || null,
        municipioId: dto.obra_id ? null : municipioId ?? null,
        obraId: dto.obra_id ?? null,
        umbralDias: dto.umbral_dias ?? null,
        umbralPorcentaje: dto.umbral_porcentaje ?? null,
        umbralMonto: dto.umbral_monto ?? null,
        destinatariosJson: this.toDestinatariosJson(dto.destinatarios),
        creadoPor: user.id,
      },
    });
    return this.map(created);
  }

  async update(id: string, dto: UpdateAlertaConfigDto, user: Usuario) {
    const existing = await this.prisma.alertaConfig.findFirst({
      where: { id, ...this.configWhere(user) },
    });
    if (!existing) throw new NotFoundException('Alerta config not found');
    this.assertScopeAccess(existing, user);
    await this.validateScope(
      {
        municipio_id: dto.municipio_id ?? existing.municipioId ?? undefined,
        obra_id: dto.obra_id ?? existing.obraId ?? undefined,
        programa_filtro: dto.programa_filtro ?? existing.programaFiltro ?? undefined,
      },
      user,
    );

    const updated = await this.prisma.alertaConfig.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined && { nombre: dto.nombre.trim() }),
        ...(dto.descripcion !== undefined && {
          descripcion: dto.descripcion?.trim() || null,
        }),
        ...(dto.activa !== undefined && { activa: dto.activa }),
        ...(dto.tipo !== undefined && { tipo: dto.tipo }),
        ...(dto.severidad !== undefined && { severidad: dto.severidad }),
        ...(dto.programa_filtro !== undefined && {
          programaFiltro: dto.programa_filtro?.trim() || null,
        }),
        ...(dto.municipio_id !== undefined && { municipioId: dto.municipio_id }),
        ...(dto.obra_id !== undefined && {
          obraId: dto.obra_id,
          municipioId: dto.obra_id ? null : undefined,
        }),
        ...(dto.umbral_dias !== undefined && { umbralDias: dto.umbral_dias }),
        ...(dto.umbral_porcentaje !== undefined && {
          umbralPorcentaje: dto.umbral_porcentaje,
        }),
        ...(dto.umbral_monto !== undefined && { umbralMonto: dto.umbral_monto }),
        ...(dto.destinatarios !== undefined && {
          destinatariosJson: this.toDestinatariosJson(dto.destinatarios),
        }),
      },
    });
    return this.map(updated);
  }

  async toggle(id: string, user: Usuario) {
    const existing = await this.prisma.alertaConfig.findFirst({
      where: { id, ...this.configWhere(user) },
    });
    if (!existing) throw new NotFoundException('Alerta config not found');
    const updated = await this.prisma.alertaConfig.update({
      where: { id },
      data: { activa: !existing.activa },
    });
    return this.map(updated);
  }

  async remove(id: string, user: Usuario) {
    const existing = await this.prisma.alertaConfig.findFirst({
      where: { id, ...this.configWhere(user) },
    });
    if (!existing) throw new NotFoundException('Alerta config not found');
    await this.prisma.alertaConfig.delete({ where: { id } });
    return { deleted: true };
  }

  async simular(id: string, user: Usuario) {
    const config = await this.prisma.alertaConfig.findFirst({
      where: { id, ...this.configWhere(user) },
    });
    if (!config) throw new NotFoundException('Alerta config not found');

    const matches = await this.evaluator.evaluateConfig(config);
    const destinatarios = this.mapDestinatarios(config.destinatariosJson);

    const destinatarioPayload = destinatarios.flatMap((dest) =>
      matches.map((match) => ({
        nombre: dest.nombre,
        telefono: dest.telefono,
        mensaje: this.evaluator.buildWhatsAppMessage(config, match),
      })),
    );

    if (destinatarioPayload.length === 0 && destinatarios.length > 0) {
      for (const dest of destinatarios) {
        destinatarioPayload.push({
          nombre: dest.nombre,
          telefono: dest.telefono,
          mensaje: `[ARKON Demo] Regla "${config.nombre}" activa. No hay obras que cumplan el criterio en este momento.`,
        });
      }
    }

    this.evaluator.logSimulatedDispatch(
      config,
      matches,
      destinatarios.map((d) => ({ nombre: d.nombre, telefono: d.telefono })),
    );

    return {
      simulado: true,
      destinatarios: destinatarioPayload,
      alertas_generadas: matches.length,
    };
  }

  async processActiveConfigs(): Promise<number> {
    const configs = await this.prisma.alertaConfig.findMany({
      where: { activa: true },
    });
    let created = 0;
    const today = new Date().toISOString().slice(0, 10);

    for (const config of configs) {
      const matches = await this.evaluator.evaluateConfig(config);
      const destinatarios = this.mapDestinatarios(config.destinatariosJson);

      for (const match of matches) {
        const existing = await this.prisma.alerta.findFirst({
          where: { obraId: match.obraId, tipo: config.tipo, atendida: false },
        });
        if (existing) continue;

        await this.prisma.alerta.create({
          data: {
            obraId: match.obraId,
            municipio: match.municipio,
            municipioId: match.municipioId,
            titulo: match.titulo,
            descripcion: match.descripcion,
            tipo: config.tipo,
            severidad: config.severidad,
            fechaGeneracion: today,
            atendida: false,
          },
        });
        created++;
      }

      if (matches.length > 0 && destinatarios.length > 0) {
        this.evaluator.logSimulatedDispatch(
          config,
          matches,
          destinatarios.map((d) => ({ nombre: d.nombre, telefono: d.telefono })),
        );
      }
    }

    return created;
  }
}
