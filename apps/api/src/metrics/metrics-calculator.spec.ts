import {
  calculateEvm,
  calculateRisk,
  contractorScore,
  dataQuality,
  detectAnomalies,
} from './metrics-calculator';

describe('metrics-calculator', () => {
  const baseAccion = {
    id: '1',
    folio: 'TEST-001',
    avanceFisicoProgramado: 80,
    avanceFisicoReal: 60,
    avanceFinanciero: 75,
    montoAutorizado: 1000000,
    montoContratado: 950000,
    montoEjercido: 700000,
    fechaTerminoProgramada: '2026-12-31',
    estatus: 'en_ejecucion_retraso',
    tipoAccion: 'agua_potable',
    poblacionBeneficiada: 5000,
    coberturaApAntes: 70,
    coberturaApMeta: 90,
    coberturaTarAntes: 60,
    coberturaTarMeta: 80,
    caudalLps: 10,
    updatedAt: new Date(),
  } as never;

  it('calculates risk score with factors', () => {
    const risk = calculateRisk(baseAccion, 2, 15);
    expect(risk.score).toBeGreaterThan(0);
    expect(['verde', 'ambar', 'rojo']).toContain(risk.nivel);
    expect(risk.factores.rezago_fisico).toBe(20);
  });

  it('calculates EVM metrics', () => {
    const evm = calculateEvm(baseAccion, [
      { periodo: '2024-01', programado: 20, reportado: 15 } as never,
      { periodo: '2024-02', programado: 40, reportado: 35 } as never,
    ]);
    expect(evm.bac).toBe(1000000);
    expect(evm.ev).toBe(600000);
    expect(evm.curva_s.length).toBe(2);
  });

  it('detects anomalies', () => {
    const result = detectAnomalies(baseAccion, []);
    expect(result.flags.length).toBeGreaterThan(0);
    expect(result.score).toBeGreaterThan(0);
  });

  it('scores contractors', () => {
    const score = contractorScore([baseAccion], new Set());
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('reports data quality', () => {
    const dq = dataQuality(10, 8, 9, 10, 7, 6);
    expect(dq.score_global).toBeGreaterThan(0);
    expect(dq.pct_geo).toBe(80);
  });
});
