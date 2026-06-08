import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Rol, Usuario } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async findAll(user: Usuario) {
    if (user.rol === Rol.contratista) throw new ForbiddenException('Access denied');
    let where = {};
    if (user.rol === Rol.municipal && user.municipioId) {
      where = {
        OR: [{ municipioId: user.municipioId }, { rol: Rol.estatal }],
      };
    }
    const users = await this.prisma.usuario.findMany({
      where,
      orderBy: { email: 'asc' },
    });
    return users.map((u) => this.toSnakeUserResponse(u));
  }

  private toSnakeUserResponse(user: Usuario) {
    const base = this.auth.toUserResponse(user);
    return {
      id: base.id,
      email: base.email,
      full_name: base.fullName,
      role: base.role,
      avatar_initials: base.avatarInitials,
      is_active: base.isActive,
      municipio_id: base.municipioId,
      contratista_id: base.contratistaId,
      telefono: base.telefono ?? null,
    };
  }

  async findOne(id: string, user: Usuario) {
    if (user.rol !== Rol.estatal && user.id !== id) {
      throw new ForbiddenException('Access denied');
    }
    const u = await this.prisma.usuario.findUnique({ where: { id } });
    if (!u) throw new NotFoundException('User not found');
    return this.auth.toUserResponse(u);
  }

  async create(
    data: {
      email: string;
      password: string;
      full_name: string;
      role: Rol;
      avatar_initials?: string;
      municipio_id?: string;
      contratista_id?: string;
      telefono?: string;
    },
    user: Usuario,
  ) {
    if (user.rol !== Rol.estatal) throw new ForbiddenException('Only estatal');
    const created = await this.prisma.usuario.create({
      data: {
        email: data.email,
        passwordHash: await bcrypt.hash(data.password, 10),
        fullName: data.full_name,
        rol: data.role,
        avatarInitials: data.avatar_initials ?? 'US',
        municipioId: data.municipio_id,
        contratistaId: data.contratista_id,
        telefono: data.telefono?.trim() || null,
      },
    });
    return this.toSnakeUserResponse(created);
  }

  async update(
    id: string,
    data: { is_active?: boolean; full_name?: string; telefono?: string },
    user: Usuario,
  ) {
    if (user.rol !== Rol.estatal) throw new ForbiddenException('Only estatal');
    if (
      data.is_active === undefined &&
      data.full_name === undefined &&
      data.telefono === undefined
    ) {
      throw new BadRequestException('At least one field is required');
    }
    if (data.full_name !== undefined && !data.full_name.trim()) {
      throw new BadRequestException('full_name cannot be empty');
    }
    const existing = await this.prisma.usuario.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');
    const updated = await this.prisma.usuario.update({
      where: { id },
      data: {
        ...(data.is_active !== undefined && { isActive: data.is_active }),
        ...(data.full_name !== undefined && { fullName: data.full_name.trim() }),
        ...(data.telefono !== undefined && { telefono: data.telefono.trim() || null }),
      },
    });
    return this.toSnakeUserResponse(updated);
  }

  async remove(id: string, user: Usuario) {
    if (user.rol !== Rol.estatal) throw new ForbiddenException('Only estatal');
    await this.prisma.usuario.delete({ where: { id } });
    return { deleted: true };
  }
}
