import { Rol, Usuario } from '@prisma/client';
import { ScopeService } from '../common/scope.service';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let prisma: { avanceMensual: { findMany: jest.Mock } };
  let scope: { obraWhere: jest.Mock };
  let service: DashboardService;

  const estatalUser = {
    id: 'estatal-id',
    rol: Rol.estatal,
    municipioId: null,
    contratistaId: null,
  } as Usuario;

  beforeEach(() => {
    prisma = {
      avanceMensual: { findMany: jest.fn() },
    };
    scope = {
      obraWhere: jest.fn().mockReturnValue({}),
    };
    service = new DashboardService(
      prisma as unknown as PrismaService,
      scope as unknown as ScopeService,
    );
  });

  describe('avanceTimeline', () => {
    it('aggregates averages per periodo sorted chronologically', async () => {
      prisma.avanceMensual.findMany.mockResolvedValue([
        { periodo: 'Marzo', programado: 20, reportado: 18 },
        { periodo: 'Enero', programado: 10, reportado: 8 },
        { periodo: 'Enero', programado: 30, reportado: 22 },
        { periodo: 'Marzo', programado: 40, reportado: 36 },
      ]);

      const timeline = await service.avanceTimeline(estatalUser);

      expect(scope.obraWhere).toHaveBeenCalledWith(estatalUser);
      expect(prisma.avanceMensual.findMany).toHaveBeenCalledWith({
        where: { obra: {} },
        select: { periodo: true, programado: true, reportado: true },
      });
      expect(timeline).toEqual([
        { mes: 'Enero', programado: 20, real: 15 },
        { mes: 'Marzo', programado: 30, real: 27 },
      ]);
    });

    it('returns empty array when no avances', async () => {
      prisma.avanceMensual.findMany.mockResolvedValue([]);
      await expect(service.avanceTimeline(estatalUser)).resolves.toEqual([]);
    });
  });
});
