import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Accion, Obra, Prisma, Rol, Usuario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ScopeService {
  constructor(private readonly prisma: PrismaService) {}

  obraWhere(user: Usuario): Prisma.AccionWhereInput {
    if (user.rol === Rol.estatal) return {};
    if (user.rol === Rol.municipal && user.municipioId) {
      return { municipioId: user.municipioId };
    }
    if (user.rol === Rol.contratista && user.contratistaId) {
      return { contratistaId: user.contratistaId };
    }
    return { id: '00000000-0000-0000-0000-000000000000' };
  }

  obraFisicaWhere(user: Usuario): Prisma.ObraWhereInput {
    if (user.rol === Rol.estatal) return {};
    if (user.rol === Rol.municipal && user.municipioId) {
      return { municipioId: user.municipioId };
    }
    if (user.rol === Rol.contratista && user.contratistaId) {
      return { acciones: { some: { contratistaId: user.contratistaId } } };
    }
    return { id: '00000000-0000-0000-0000-000000000000' };
  }

  alertaWhere(user: Usuario): Prisma.AlertaWhereInput {
    if (user.rol === Rol.estatal) return {};
    if (user.rol === Rol.municipal && user.municipioId) {
      return {
        OR: [
          { municipioId: user.municipioId },
          { accion: { municipioId: user.municipioId } },
        ],
      };
    }
    if (user.rol === Rol.contratista && user.contratistaId) {
      return { accion: { contratistaId: user.contratistaId } };
    }
    return { id: '00000000-0000-0000-0000-000000000000' };
  }

  async getObraOrThrow(obraId: string, user: Usuario): Promise<Accion> {
    const obra = await this.prisma.accion.findUnique({
      where: { id: obraId },
      include: { municipio: true, contratista: true },
    });
    if (!obra) throw new NotFoundException('Accion not found');
    this.assertObraAccess(obra, user);
    return obra;
  }

  assertObraAccess(obra: Accion, user: Usuario): void {
    if (user.rol === Rol.estatal) return;
    if (user.rol === Rol.municipal && obra.municipioId !== user.municipioId) {
      throw new ForbiddenException('Access denied');
    }
    if (user.rol === Rol.contratista && obra.contratistaId !== user.contratistaId) {
      throw new ForbiddenException('Access denied');
    }
  }

  async getObraFisicaOrThrow(obraId: string, user: Usuario): Promise<Obra> {
    const obra = await this.prisma.obra.findUnique({
      where: { id: obraId },
      include: { municipio: true },
    });
    if (!obra) throw new NotFoundException('Obra not found');
    if (user.rol === Rol.estatal) return obra;
    if (user.rol === Rol.municipal && obra.municipioId !== user.municipioId) {
      throw new ForbiddenException('Access denied');
    }
    if (user.rol === Rol.contratista && user.contratistaId) {
      const linked = await this.prisma.accion.count({
        where: { obraFisicaId: obraId, contratistaId: user.contratistaId },
      });
      if (linked === 0) throw new ForbiddenException('Access denied');
    }
    return obra;
  }

  municipioWhere(user: Usuario): Prisma.MunicipioWhereInput {
    if (user.rol === Rol.estatal) return {};
    if (user.rol === Rol.municipal && user.municipioId) {
      return { id: user.municipioId };
    }
    if (user.rol === Rol.contratista && user.contratistaId) {
      return { acciones: { some: { contratistaId: user.contratistaId } } };
    }
    return { id: '00000000-0000-0000-0000-000000000000' };
  }

  contratistaWhere(user: Usuario): Prisma.ContratistaWhereInput {
    if (user.rol === Rol.estatal) return {};
    if (user.rol === Rol.municipal && user.municipioId) {
      return { acciones: { some: { municipioId: user.municipioId } } };
    }
    if (user.rol === Rol.contratista && user.contratistaId) {
      return { id: user.contratistaId };
    }
    return { id: '00000000-0000-0000-0000-000000000000' };
  }

  organismoOperadorWhere(user: Usuario): Prisma.OrganismoOperadorWhereInput {
    if (user.rol === Rol.estatal) return {};
    if (user.rol === Rol.municipal && user.municipioId) {
      return { OR: [{ municipioId: user.municipioId }, { municipioId: null }] };
    }
    if (user.rol === Rol.contratista) {
      return { id: '00000000-0000-0000-0000-000000000000' };
    }
    return { id: '00000000-0000-0000-0000-000000000000' };
  }

  alertaConfigWhere(user: Usuario): Prisma.AlertaConfigWhereInput {
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
    if (user.rol === Rol.contratista && user.contratistaId) {
      return { accion: { contratistaId: user.contratistaId } };
    }
    return { id: '00000000-0000-0000-0000-000000000000' };
  }
}
