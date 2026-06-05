import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Rol } from '@prisma/client';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  const prisma = {
    usuario: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const config = {
    get: jest.fn((key: string, defaultValue?: string) => {
      if (key === 'ALLOW_PUBLIC_REGISTER') return 'true';
      if (key === 'JWT_EXPIRES_MINUTES') return '480';
      return defaultValue;
    }),
  };

  const jwt = { sign: jest.fn().mockReturnValue('token') };
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
    );
  });

  describe('register', () => {
    it('always assigns contratista role regardless of client-supplied role in body', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);
      prisma.usuario.create.mockResolvedValue({
        id: 'new-id',
        email: 'new@arkon.gob.mx',
        passwordHash: 'hash',
        fullName: 'Nuevo',
        rol: Rol.contratista,
        avatarInitials: 'US',
        isActive: true,
        municipioId: null,
        contratistaId: null,
        lastLogin: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.register({
        email: 'new@arkon.gob.mx',
        password: 'Secret123!',
        fullName: 'Nuevo',
      });

      expect(prisma.usuario.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          rol: Rol.contratista,
          email: 'new@arkon.gob.mx',
        }),
      });
    });

    it('throws when public registration is disabled', async () => {
      (config.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'ALLOW_PUBLIC_REGISTER') return 'false';
        return undefined;
      });

      await expect(
        service.register({
          email: 'x@arkon.gob.mx',
          password: 'Secret123!',
          fullName: 'X',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
