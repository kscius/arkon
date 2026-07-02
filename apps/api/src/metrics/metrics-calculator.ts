import { Accion, Alerta, AvanceMensual, Documento, Estimacion } from '@prisma/client';

export type RiesgoNivel = 'verde' | 'ambar' | 'rojo';

export interface RiesgoFactores {
  rezago_fisico: number;
  brecha_financiera: number;
  dias_sin_actualizacion: number;
  alertas_abiertas: number;
  exceso_ejercido: number;
  plazo_proximo: number;
}

export interface EvmResult {
  pv: number;
  ev: number;
  ac: number;
  bac: number;
  spi: number | null;
  cpi: number | null;
  eac: number | null;
  etc: number | null;
  vac: number | null;
  tcpi: number | null;
  curva_s: Array<{ periodo: string; pv: number; ev: number; ac: number }>;
}

export interface RiskResult {
  score: number;
  nivel: RiesgoNivel;
  factores: RiesgoFactores;
}

export interface AnomalyResult {
  score: number;
  flags: string[];
}

export interface PredictionResult {
  prob_retraso: number;
  prob_sobrecosto: number;
  factores: Record<string, number>;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10000) / 10000;

export function daysSince(date: Date | string | null | undefined): number {
  if (!date) return 999;
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return 999;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function parseFecha(fecha: string | null | undefined): Date | null {
  if (!fecha) return null;
  const d = new Date(fecha);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function calculateRisk(
  accion: Accion,
  alertasAbiertas: number,
  diasSinActualizacion: number,
): RiskResult {
  const rezagoFisico = Math.max(
    0,
    Number(accion.avanceFisicoProgramado) - Number(accion.avanceFisicoReal),
  );
  const brechaFinanciera = Math.abs(
    Number(accion.avanceFinanciero) - Number(accion.avanceFisicoReal),
  );
  const montoAutorizado = Number(accion.montoAutorizado) || 1;
  const montoContratado = Number(accion.montoContratado) || montoAutorizado;
  const excesoEjercido =
    Number(accion.montoEjercido) > montoContratado
      ? ((Number(accion.montoEjercido) - montoContratado) / montoContratado) * 100
      : 0;

  let plazoProximo = 0;
  const fin = parseFecha(accion.fechaTerminoProgramada);
  if (fin) {
    const diasRestantes = Math.floor((fin.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diasRestantes < 0) plazoProximo = Math.min(100, Math.abs(diasRestantes) * 2);
    else if (diasRestantes < 30) plazoProximo = (30 - diasRestantes) * 2;
  }

  const factores: RiesgoFactores = {
    rezago_fisico: round2(rezagoFisico),
    brecha_financiera: round2(brechaFinanciera),
    dias_sin_actualizacion: diasSinActualizacion,
    alertas_abiertas: alertasAbiertas,
    exceso_ejercido: round2(excesoEjercido),
    plazo_proximo: round2(plazoProximo),
  };

  const score = Math.min(
    100,
    rezagoFisico * 2 +
      brechaFinanciera * 1.5 +
      Math.min(diasSinActualizacion, 90) * 0.3 +
      alertasAbiertas * 8 +
      excesoEjercido * 0.5 +
      plazoProximo * 0.4,
  );

  let nivel: RiesgoNivel = 'verde';
  if (score >= 60) nivel = 'rojo';
  else if (score >= 30) nivel = 'ambar';

  return { score: round2(score), nivel, factores };
}

export function calculateEvm(
  accion: Accion,
  avances: AvanceMensual[],
): EvmResult {
  const bac = Number(accion.montoAutorizado) || 0;
  const ac = Number(accion.montoEjercido) || 0;
  const pctFisico = Number(accion.avanceFisicoReal) / 100;
  const pctProgramado = Number(accion.avanceFisicoProgramado) / 100;
  const ev = bac * pctFisico;
  const pv = bac * pctProgramado;

  const spi = pv > 0 ? ev / pv : null;
  const cpi = ac > 0 ? ev / ac : null;
  let eac: number | null = null;
  let etc: number | null = null;
  let vac: number | null = null;
  let tcpi: number | null = null;

  if (cpi && cpi > 0) {
    eac = ac + (bac - ev) / cpi;
    etc = eac - ac;
    vac = bac - eac;
    const denom = bac - ac;
    tcpi = denom > 0 ? (bac - ev) / denom : null;
  }

  const sorted = [...avances].sort((a, b) => a.periodo.localeCompare(b.periodo));
  let cumPv = 0;
  let cumEv = 0;
  let cumAc = 0;
  const curva_s = sorted.map((a) => {
    const pctProg = Number(a.programado) / 100;
    const pctRep = Number(a.reportado) / 100;
    cumPv += bac * (pctProg / Math.max(sorted.length, 1));
    cumEv += bac * (pctRep / Math.max(sorted.length, 1));
    cumAc += (Number(a.reportado) / 100) * bac * 0.95;
    return {
      periodo: a.periodo,
      pv: round2(cumPv),
      ev: round2(cumEv),
      ac: round2(cumAc),
    };
  });

  return {
    pv: round2(pv),
    ev: round2(ev),
    ac: round2(ac),
    bac: round2(bac),
    spi: spi !== null ? round4(spi) : null,
    cpi: cpi !== null ? round4(cpi) : null,
    eac: eac !== null ? round2(eac) : null,
    etc: etc !== null ? round2(etc) : null,
    vac: vac !== null ? round2(vac) : null,
    tcpi: tcpi !== null ? round4(tcpi) : null,
    curva_s,
  };
}

export function detectAnomalies(
  accion: Accion,
  estimaciones: Estimacion[],
): AnomalyResult {
  const flags: string[] = [];
  let score = 0;
  const gap = Math.abs(Number(accion.avanceFinanciero) - Number(accion.avanceFisicoReal));
  if (gap >= 15) {
    flags.push('brecha_fisico_financiera');
    score += gap;
  }
  const lag =
    Number(accion.avanceFisicoProgramado) - Number(accion.avanceFisicoReal);
  if (lag >= 10) {
    flags.push('retraso_fisico');
    score += lag * 1.5;
  }
  if (Number(accion.montoEjercido) > Number(accion.montoContratado) && Number(accion.montoContratado) > 0) {
    flags.push('ejercido_excede_contratado');
    score += 20;
  }
  const rechazadas = estimaciones.filter((e) => e.estatus === 'rechazada').length;
  if (rechazadas >= 2) {
    flags.push('estimaciones_rechazadas_recurrentes');
    score += rechazadas * 10;
  }
  return { score: round2(Math.min(100, score)), flags };
}

export function predictDelayAndCost(
  accion: Accion,
  riskScore: number,
  evm: EvmResult,
): PredictionResult {
  let probRetraso = 0.1;
  let probSobrecosto = 0.1;
  const factores: Record<string, number> = {};

  if (riskScore >= 60) {
    probRetraso += 0.35;
    factores.riesgo_alto = riskScore;
  } else if (riskScore >= 30) {
    probRetraso += 0.2;
    factores.riesgo_medio = riskScore;
  }

  if (evm.spi !== null && evm.spi < 0.9) {
    probRetraso += 0.25;
    factores.spi_bajo = evm.spi;
  }
  if (evm.cpi !== null && evm.cpi < 0.9) {
    probSobrecosto += 0.3;
    factores.cpi_bajo = evm.cpi;
  }
  if (evm.tcpi !== null && evm.tcpi > 1.1) {
    probSobrecosto += 0.2;
    factores.tcpi_alto = evm.tcpi;
  }

  const lag =
    Number(accion.avanceFisicoProgramado) - Number(accion.avanceFisicoReal);
  if (lag > 15) {
    probRetraso += 0.15;
    factores.rezago_fisico = lag;
  }

  return {
    prob_retraso: round4(Math.min(0.99, probRetraso)),
    prob_sobrecosto: round4(Math.min(0.99, probSobrecosto)),
    factores,
  };
}

export function contractorScore(
  obras: Accion[],
  alertasPorObra: Set<string>,
): number {
  if (obras.length === 0) return 0;
  const avanceProm =
    obras.reduce((s, o) => s + Number(o.avanceFisicoReal), 0) / obras.length;
  const alertas = obras.filter((o) => alertasPorObra.has(o.id)).length;
  const retraso = obras.filter(
    (o) =>
      o.estatus === 'en_ejecucion_retraso' || o.estatus === 'en_riesgo',
  ).length;
  const score =
    avanceProm * 0.5 +
    (100 - (alertas / obras.length) * 30) * 0.25 +
    (100 - (retraso / obras.length) * 40) * 0.25;
  return round2(Math.max(0, Math.min(100, score)));
}

export function marginacionOrdinal(marginacion: string | null | undefined): number {
  const map: Record<string, number> = {
    'muy bajo': 1,
    bajo: 2,
    medio: 3,
    alto: 4,
    'muy alto': 5,
  };
  if (!marginacion) return 3;
  return map[marginacion.toLowerCase()] ?? 3;
}

export function gapIndex(
  inversionPerCapita: number,
  marginacion: string | null | undefined,
  poblacion: number,
  esZap: boolean,
): number {
  const need = marginacionOrdinal(marginacion) * (esZap ? 1.5 : 1) * Math.log10(poblacion + 10);
  const inv = Math.log10(inversionPerCapita + 1);
  return round2(need - inv);
}

export interface MirKpis {
  i1_cobertura_ap_delta: number;
  i2_cobertura_alcantarillado_delta: number;
  i3_tratamiento_pct: number;
  i4_desinfeccion_pct: number;
  poblacion_beneficiada_total: number;
  acciones_con_caudal: number;
}

export function calculateMirFromAcciones(acciones: Accion[]): MirKpis {
  const pobTotal = acciones.reduce((s, a) => s + (a.poblacionBeneficiada || 0), 0);
  const conCaudal = acciones.filter((a) => a.caudalLps && Number(a.caudalLps) > 0).length;
  const apMeta = acciones.reduce((s, a) => s + Number(a.coberturaApMeta ?? 0), 0);
  const apAntes = acciones.reduce((s, a) => s + Number(a.coberturaApAntes ?? 0), 0);
  const tarMeta = acciones.reduce((s, a) => s + Number(a.coberturaTarMeta ?? 0), 0);
  const tarAntes = acciones.reduce((s, a) => s + Number(a.coberturaTarAntes ?? 0), 0);
  return {
    i1_cobertura_ap_delta: round2(apMeta - apAntes),
    i2_cobertura_alcantarillado_delta: round2(tarMeta - tarAntes),
    i3_tratamiento_pct: acciones.length
      ? round2((conCaudal / acciones.length) * 100)
      : 0,
    i4_desinfeccion_pct: acciones.filter((a) => a.tipoAccion === 'agua_potable').length
      ? round2(
          (acciones.filter((a) => Number(a.avanceFisicoReal) >= 80).length /
            acciones.filter((a) => a.tipoAccion === 'agua_potable').length) *
            100,
        )
      : 0,
    poblacion_beneficiada_total: pobTotal,
    acciones_con_caudal: conCaudal,
  };
}

export interface DataQualityReport {
  total_acciones: number;
  con_geo: number;
  con_contratista: number;
  con_avances: number;
  con_documentos: number;
  con_cua: number;
  pct_geo: number;
  pct_contratista: number;
  pct_avances: number;
  pct_documentos: number;
  pct_cua: number;
  score_global: number;
}

export function dataQuality(
  total: number,
  conGeo: number,
  conContratista: number,
  conAvances: number,
  conDocumentos: number,
  conCua: number,
): DataQualityReport {
  const pct = (n: number) => (total > 0 ? round2((n / total) * 100) : 0);
  const score =
    total > 0
      ? (conGeo + conContratista + conAvances + conDocumentos + conCua) / (total * 5)
      : 0;
  return {
    total_acciones: total,
    con_geo: conGeo,
    con_contratista: conContratista,
    con_avances: conAvances,
    con_documentos: conDocumentos,
    con_cua: conCua,
    pct_geo: pct(conGeo),
    pct_contratista: pct(conContratista),
    pct_avances: pct(conAvances),
    pct_documentos: pct(conDocumentos),
    pct_cua: pct(conCua),
    score_global: round2(score * 100),
  };
}

export interface ComplianceItem {
  codigo: string;
  descripcion: string;
  fecha_limite: string;
  dias_restantes: number;
  severidad: 'critica' | 'alta' | 'media' | 'baja';
  programa: string;
}

export function proaguaComplianceCalendar(ejercicio: number): ComplianceItem[] {
  const items: ComplianceItem[] = [];
  const now = new Date();
  const add = (
    codigo: string,
    descripcion: string,
    fecha: Date,
    severidad: ComplianceItem['severidad'],
    programa = 'PROAGUA',
  ) => {
    const dias = Math.floor((fecha.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    items.push({
      codigo,
      descripcion,
      fecha_limite: fecha.toISOString().slice(0, 10),
      dias_restantes: dias,
      severidad,
      programa,
    });
  };
  add('AVANCE_MENSUAL', 'Avance fisico-financiero (primeros 5 dias habiles del mes)', new Date(now.getFullYear(), now.getMonth(), 5), 'alta');
  add('CONCLUSION_OBRAS', 'Conclusion de obras', new Date(ejercicio, 11, 31), 'critica');
  add('CIERRE_EJERCICIO', 'Cierre de ejercicio fiscal', new Date(ejercicio + 1, 0, 31), 'alta');
  add('REINTEGRO_TESOFE', 'Reintegro recursos no devengados (15 dias naturales)', new Date(ejercicio + 1, 0, 15), 'critica');
  add('INFORME_TRIMESTRAL', `Informe trimestral Q${Math.ceil((now.getMonth() + 1) / 3)}`, new Date(ejercicio, Math.ceil((now.getMonth() + 1) / 3) * 3 - 1, 15), 'media');
  return items.sort((a, b) => a.dias_restantes - b.dias_restantes);
}
