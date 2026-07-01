import { EstatusAccion, Rol, Usuario } from '@prisma/client';
import { ScopeService } from '../common/scope.service';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let prisma: {
    avanceMensual: { findMany: jest.Mock };
    accion: { findMany: jest.Mock };
    alerta: { findMany: jest.Mock };
    municipio: { findMany: jest.Mock };
  };
  let scope: { obraWhere: jest.Mock; alertaWhere: jest.Mock };
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
      accion: { findMany: jest.fn() },
      alerta: { findMany: jest.fn().mockResolvedValue([]) },
      municipio: { findMany: jest.fn() },
    };
    scope = {
      obraWhere: jest.fn().mockReturnValue({}),
      alertaWhere: jest.fn().mockReturnValue({}),
    };
    service = new DashboardService(
      prisma as unknown as PrismaService,
      scope as unknown as ScopeService,
    );
  });

  describe('getKpis', () => {
    it('counts execution, delay, and risk as mutually exclusive estatus buckets', async () => {
      prisma.accion.findMany.mockResolvedValue([
        { estatus: EstatusAccion.en_ejecucion_a_tiempo, montoAutorizado: 1, montoEjercido: 0, avanceFisicoReal: 50, avanceFinanciero: 40 },
        { estatus: EstatusAccion.en_ejecucion_a_tiempo, montoAutorizado: 1, montoEjercido: 0, avanceFisicoReal: 60, avanceFinanciero: 50 },
        { estatus: EstatusAccion.en_ejecucion_retraso, montoAutorizado: 1, montoEjercido: 0, avanceFisicoReal: 30, avanceFinanciero: 20 },
        { estatus: EstatusAccion.en_riesgo, montoAutorizado: 1, montoEjercido: 0, avanceFisicoReal: 10, avanceFinanciero: 5 },
        { estatus: EstatusAccion.concluida, montoAutorizado: 1, montoEjercido: 1, avanceFisicoReal: 100, avanceFinanciero: 100 },
      ]);

      const kpis = await service.getKpis(estatalUser);

      expect(kpis.total_obras).toBe(5);
      expect(kpis.obras_ejecucion).toBe(2);
      expect(kpis.obras_retraso).toBe(1);
      expect(kpis.obras_riesgo).toBe(1);
      expect(kpis.obras_concluidas).toBe(1);
    });
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
        where: { accion: {} },
        select: { periodo: true, programado: true, reportado: true },
      });
      expect(timeline).toEqual([
        { mes: 'Enero', programado: 20, real: 15 },
        { mes: 'Marzo', programado: 30, real: 27 },
      ]);
    });

    it('sorts month-year labels chronologically, not alphabetically', async () => {
      prisma.avanceMensual.findMany.mockResolvedValue([
        { periodo: 'Abril 2024', programado: 50, reportado: 48 },
        { periodo: 'Agosto 2024', programado: 100, reportado: 97 },
        { periodo: 'Enero 2024', programado: 12.5, reportado: 10 },
        { periodo: 'Febrero 2024', programado: 25, reportado: 22 },
        { periodo: 'Julio 2024', programado: 87.5, reportado: 85 },
        { periodo: 'Junio 2024', programado: 75, reportado: 73 },
        { periodo: 'Marzo 2024', programado: 37.5, reportado: 35 },
        { periodo: 'Mayo 2024', programado: 62.5, reportado: 60 },
      ]);

      const timeline = await service.avanceTimeline(estatalUser);

      expect(timeline.map((p) => p.mes)).toEqual([
        'Enero 2024',
        'Febrero 2024',
        'Marzo 2024',
        'Abril 2024',
        'Mayo 2024',
        'Junio 2024',
        'Julio 2024',
        'Agosto 2024',
      ]);
    });

    it('returns empty array when no avances', async () => {
      prisma.avanceMensual.findMany.mockResolvedValue([]);
      await expect(service.avanceTimeline(estatalUser)).resolves.toEqual([]);
    });
  });

  describe('topMunicipios', () => {
    it('ranks by distinct programs, then obras, then investment, then name', async () => {
      prisma.accion.findMany.mockResolvedValue([
        { municipioId: 'm1', programa: 'PEAS', montoAutorizado: 10 },
        { municipioId: 'm1', programa: 'PROAGUA', montoAutorizado: 20 },
        { municipioId: 'm2', programa: 'PEAS', montoAutorizado: 100 },
        { municipioId: 'm2', programa: 'PRODDER', montoAutorizado: 50 },
        { municipioId: 'm3', programa: 'PROAGUA', montoAutorizado: 200 },
        { municipioId: 'm3', programa: 'PROAGUA', montoAutorizado: 5 },
        { municipioId: 'm4', programa: 'PEAS', montoAutorizado: 80 },
        { municipioId: 'm4', programa: 'PRODDER', montoAutorizado: 10 },
      ]);
      prisma.municipio.findMany.mockResolvedValue([
        { id: 'm1', nombre: 'Zaragoza' },
        { id: 'm2', nombre: 'León' },
        { id: 'm3', nombre: 'Celaya' },
        { id: 'm4', nombre: 'Cortázar' },
      ]);

      const rows = await service.topMunicipios(estatalUser);

      expect(rows.map((r) => r.municipio)).toEqual(['León', 'Cortázar', 'Zaragoza', 'Celaya']);
      expect(rows[0]).toMatchObject({ programas_count: 2, obras_count: 2, inversion_total: 150 });
      expect(rows[2]).toMatchObject({ programas_count: 2, obras_count: 2, inversion_total: 30 });
      expect(rows[3]).toMatchObject({ programas_count: 1, obras_count: 2, inversion_total: 205 });
    });

    it('returns empty array when no obras', async () => {
      prisma.accion.findMany.mockResolvedValue([]);
      prisma.municipio.findMany.mockResolvedValue([]);
      await expect(service.topMunicipios(estatalUser)).resolves.toEqual([]);
    });
  });
});
