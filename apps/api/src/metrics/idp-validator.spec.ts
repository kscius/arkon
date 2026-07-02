import { Accion, Estimacion } from '@prisma/client';
import { validateAccionIdp } from './idp-validator';

describe('idp-validator', () => {
  const accion = {
    id: 'a1',
    folio: 'TEST-001',
    nombre: 'Obra test',
    montoContratado: 1000000 as unknown as Accion['montoContratado'],
    montoAutorizado: 1000000 as unknown as Accion['montoAutorizado'],
  };

  it('flags missing document categories', () => {
    const report = validateAccionIdp(accion, [], []);
    expect(report.discrepancias.length).toBeGreaterThanOrEqual(3);
    expect(report.completitud_pct).toBe(0);
  });

  it('flags estimaciones over contract', () => {
    const report = validateAccionIdp(
      accion,
      [
        { categoria: 'administrativa', estatus: 'cargado', fechaCarga: '2024-01-01', nombre: 'x' },
        { categoria: 'tecnica', estatus: 'cargado', fechaCarga: '2024-01-01', nombre: 'y' },
        { categoria: 'ejecucion', estatus: 'cargado', fechaCarga: '2024-01-01', nombre: 'z' },
      ],
      [
        { montoEstimado: 600000 as unknown as Estimacion['montoEstimado'], estatus: 'autorizada' },
        { montoEstimado: 500000 as unknown as Estimacion['montoEstimado'], estatus: 'presentada' },
      ],
    );
    expect(report.discrepancias.some((d) => d.codigo === 'EST_EXCEDE_CONTRATO')).toBe(true);
    expect(report.completitud_pct).toBe(100);
  });
});
