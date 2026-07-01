import { Rol, Usuario } from '@prisma/client';
import { ScopeService } from './scope.service';

describe('ScopeService', () => {
  const service = new ScopeService({} as never);

  const baseUser = (overrides: Partial<Usuario>): Usuario =>
    ({
      id: 'user-id',
      email: 'test@arkon.gob.mx',
      passwordHash: 'hash',
      fullName: 'Test User',
      rol: Rol.estatal,
      avatarInitials: 'TU',
      isActive: true,
      municipioId: null,
      contratistaId: null,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as Usuario;

  describe('alertaWhere', () => {
    it('returns empty filter for estatal', () => {
      expect(service.alertaWhere(baseUser({ rol: Rol.estatal }))).toEqual({});
    });

    it('scopes municipal to municipio or obra in municipio', () => {
      const municipioId = '11111111-1111-1111-1111-111111111111';
      expect(
        service.alertaWhere(
          baseUser({ rol: Rol.municipal, municipioId, contratistaId: null }),
        ),
      ).toEqual({
        OR: [
          { municipioId },
          { accion: { municipioId } },
        ],
      });
    });

    it('scopes contratista to obras of their contratista', () => {
      const contratistaId = '22222222-2222-2222-2222-222222222222';
      expect(
        service.alertaWhere(
          baseUser({ rol: Rol.contratista, contratistaId, municipioId: null }),
        ),
      ).toEqual({
        accion: { contratistaId },
      });
    });

    it('returns impossible id when role has no scope context', () => {
      expect(
        service.alertaWhere(
          baseUser({ rol: Rol.municipal, municipioId: null }),
        ),
      ).toEqual({ id: '00000000-0000-0000-0000-000000000000' });
    });
  });
});
