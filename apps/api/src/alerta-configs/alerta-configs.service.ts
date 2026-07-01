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

type ScopeDto = {
  programa_filtro?: string | null;
  municipio_id?: string | null;
  obra_id?: string | null;
};

type ScopeData = {
  programaFiltro: string | null;
  municipioId: string | null;
  obraId: string | null;
};

type AlertaConfigWithRelations = AlertaConfig & {
  municipio: { nombre: string } | null;
  accion: { folio: string; nombre: string } | null;
};

const CONFIG_INCLUDE = {
  municipio: { select: { nombre: true } },
  accion: { select: { folio: true, nombre: true } },
} as const;

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
          { accion: { municipioId: user.municipioId } },
          { municipioId: null, accionId: null, creador: { municipioId: user.municipioId } },
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

  private hasScopeFields(dto: ScopeDto): boolean {
    return (
      dto.programa_filtro !== undefined ||
      dto.municipio_id !== undefined ||
      dto.obra_id !== undefined
    );
  }

  private resolveScopeFields(dto: ScopeDto): ScopeData {
    if (dto.obra_id) {
      return { programaFiltro: null, municipioId: null, obraId: dto.obra_id };
    }
    if (dto.municipio_id) {
      return { programaFiltro: null, municipioId: dto.municipio_id, obraId: null };
    }
    if (dto.programa_filtro) {
      return {
        programaFiltro: dto.programa_filtro.trim() || null,
        municipioId: null,
        obraId: null,
      };
    }
    return { programaFiltro: null, municipioId: null, obraId: null };
  }

  private resolveCreateScope(dto: ScopeDto, user: Usuario): ScopeData {
    if (this.hasScopeFields(dto)) {
      return this.resolveScopeFields(dto);
    }
    const municipioId =
      user.rol === Rol.municipal && user.municipioId ? user.municipioId : null;
    return { programaFiltro: null, municipioId, obraId: null };
  }

  private map(config: AlertaConfigWithRelations) {
    return {
      id: config.id,
      nombre: config.nombre,
      descripcion: config.descripcion,
      activa: config.activa,
      tipo: config.tipo,
      severidad: config.severidad,
      programa_filtro: config.programaFiltro,
      municipio_id: config.municipioId,
      municipio_nombre: config.municipio?.nombre ?? null,
      obra_id: config.accionId,
      obra_folio: config.accion?.folio ?? null,
      obra_nombre: config.accion?.nombre ?? null,
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
    if (config.accionId) {
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
      include: CONFIG_INCLUDE,
    });
    return configs.map((c) => this.map(c));
  }

  async findOne(id: string, user: Usuario) {
    const config = await this.prisma.alertaConfig.findFirst({
      where: { id, ...this.configWhere(user) },
      include: CONFIG_INCLUDE,
    });
    if (!config) throw new NotFoundException('Alerta config not found');
    return this.map(config);
  }

  async create(dto: CreateAlertaConfigDto, user: Usuario) {
    const scope = this.resolveCreateScope(dto, user);
    await this.validateScope(
      {
        municipio_id: scope.municipioId ?? undefined,
        obra_id: scope.obraId ?? undefined,
        programa_filtro: scope.programaFiltro ?? undefined,
      },
      user,
    );

    const created = await this.prisma.alertaConfig.create({
      data: {
        nombre: dto.nombre.trim(),
        descripcion: dto.descripcion?.trim() || null,
        activa: dto.activa ?? true,
        tipo: dto.tipo,
        severidad: dto.severidad ?? 'media',
        programaFiltro: scope.programaFiltro,
        municipioId: scope.municipioId,
        accionId: scope.obraId,
        umbralDias: dto.umbral_dias ?? null,
        umbralPorcentaje: dto.umbral_porcentaje ?? null,
        umbralMonto: dto.umbral_monto ?? null,
        destinatariosJson: this.toDestinatariosJson(dto.destinatarios),
        creadoPor: user.id,
      },
      include: CONFIG_INCLUDE,
    });
    return this.map(created);
  }

  async update(id: string, dto: UpdateAlertaConfigDto, user: Usuario) {
    const existing = await this.prisma.alertaConfig.findFirst({
      where: { id, ...this.configWhere(user) },
    });
    if (!existing) throw new NotFoundException('Alerta config not found');
    this.assertScopeAccess(existing, user);

    const scopeUpdate = this.hasScopeFields(dto)
      ? this.resolveScopeFields(dto)
      : null;

    await this.validateScope(
      scopeUpdate
        ? {
            municipio_id: scopeUpdate.municipioId ?? undefined,
            obra_id: scopeUpdate.obraId ?? undefined,
            programa_filtro: scopeUpdate.programaFiltro ?? undefined,
          }
        : {
            municipio_id: existing.municipioId ?? undefined,
            obra_id: existing.accionId ?? undefined,
            programa_filtro: existing.programaFiltro ?? undefined,
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
        ...(scopeUpdate && {
          programaFiltro: scopeUpdate.programaFiltro,
          municipioId: scopeUpdate.municipioId,
          accionId: scopeUpdate.obraId,
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
      include: CONFIG_INCLUDE,
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
      include: CONFIG_INCLUDE,
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
          where: { accionId: match.obraId, tipo: config.tipo, atendida: false },
        });
        if (existing) continue;

        await this.prisma.alerta.create({
          data: {
            accionId: match.obraId,
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
