import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Rol, Usuario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto, UserResponseDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  toUserResponse(user: Usuario): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.rol,
      avatarInitials: user.avatarInitials,
      isActive: user.isActive,
      municipioId: user.municipioId,
      contratistaId: user.contratistaId,
      telefono: user.telefono,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.usuario.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Incorrect email or password');
    }
    await this.prisma.usuario.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });
    return this.buildToken(user);
  }

  async register(dto: RegisterDto) {
    const allowPublic = this.config.get<string>('ALLOW_PUBLIC_REGISTER', 'true');
    if (allowPublic === 'false') {
      throw new ForbiddenException('Public registration is disabled');
    }
    const exists = await this.prisma.usuario.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already registered');
    const user = await this.prisma.usuario.create({
      data: {
        email: dto.email,
        passwordHash: await bcrypt.hash(dto.password, 10),
        fullName: dto.fullName,
        rol: Rol.contratista,
        avatarInitials: dto.avatarInitials ?? 'US',
      },
    });
    return this.buildToken(user);
  }

  private buildToken(user: Usuario) {
    const expires = Number(this.config.get('JWT_EXPIRES_MINUTES') ?? 480);
    const access_token = this.jwt.sign(
      { sub: user.id, role: user.rol },
      { expiresIn: `${expires}m` },
    );
    return {
      access_token,
      token_type: 'bearer',
      user: this.toUserResponse(user),
    };
  }
}
