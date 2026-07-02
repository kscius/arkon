import { Accion, Documento, Estimacion } from '@prisma/client';

export const REQUIRED_DOC_CATEGORIES = [
  'administrativa',
  'tecnica',
  'ejecucion',
] as const;

export type IdpDiscrepancySeverity = 'alta' | 'media' | 'baja';

export interface IdpDiscrepancy {
  codigo: string;
  severidad: IdpDiscrepancySeverity;
  titulo: string;
  descripcion: string;
  accion_id: string;
  folio: string;
  metadata?: Record<string, unknown>;
}

export interface IdpAccionReport {
  accion_id: string;
  folio: string;
  nombre: string;
  discrepancias: IdpDiscrepancy[];
  completitud_pct: number;
}

export interface IdpPortfolioReport {
  acciones_revisadas: number;
  total_discrepancias: number;
  acciones: IdpAccionReport[];
}

export function validateAccionIdp(
  accion: Pick<Accion, 'id' | 'folio' | 'nombre' | 'montoContratado' | 'montoAutorizado'>,
  documentos: Pick<Documento, 'categoria' | 'estatus' | 'fechaCarga' | 'nombre'>[],
  estimaciones: Pick<Estimacion, 'montoEstimado' | 'estatus'>[],
): IdpAccionReport {
  const discrepancias: IdpDiscrepancy[] = [];

  for (const cat of REQUIRED_DOC_CATEGORIES) {
    const inCat = documentos.filter((d) => d.categoria === cat);
    const cargados = inCat.filter((d) => d.estatus === 'cargado' || d.estatus === 'validado');
    if (cargados.length === 0) {
      discrepancias.push({
        codigo: `DOC_FALTA_${cat.toUpperCase()}`,
        severidad: cat === 'ejecucion' ? 'alta' : 'media',
        titulo: `Documentación ${cat} incompleta`,
        descripcion: `No hay documentos cargados en categoría ${cat}.`,
        accion_id: accion.id,
        folio: accion.folio,
        metadata: { categoria: cat },
      });
    }
  }

  const sinFecha = documentos.filter(
    (d) => (d.estatus === 'cargado' || d.estatus === 'validado') && !d.fechaCarga,
  );
  if (sinFecha.length > 0) {
    discrepancias.push({
      codigo: 'DOC_SIN_FECHA',
      severidad: 'baja',
      titulo: 'Documentos sin fecha de carga',
      descripcion: `${sinFecha.length} documento(s) cargados sin fecha_carga registrada.`,
      accion_id: accion.id,
      folio: accion.folio,
      metadata: { count: sinFecha.length },
    });
  }

  const montoContratado = Number(accion.montoContratado) || Number(accion.montoAutorizado) || 0;
  const sumaEstimaciones = estimaciones
    .filter((e) => e.estatus !== 'rechazada')
    .reduce((s, e) => s + Number(e.montoEstimado), 0);

  if (montoContratado > 0 && sumaEstimaciones > montoContratado * 1.05) {
    discrepancias.push({
      codigo: 'EST_EXCEDE_CONTRATO',
      severidad: 'alta',
      titulo: 'Estimaciones exceden monto contratado',
      descripcion: `Suma estimaciones $${sumaEstimaciones.toLocaleString('es-MX')} vs contratado $${montoContratado.toLocaleString('es-MX')} (+${Math.round(((sumaEstimaciones / montoContratado) - 1) * 100)}%).`,
      accion_id: accion.id,
      folio: accion.folio,
      metadata: { suma_estimaciones: sumaEstimaciones, monto_contratado: montoContratado },
    });
  }

  const totalSlots = REQUIRED_DOC_CATEGORIES.length;
  const filled = REQUIRED_DOC_CATEGORIES.filter((cat) =>
    documentos.some(
      (d) =>
        d.categoria === cat && (d.estatus === 'cargado' || d.estatus === 'validado'),
    ),
  ).length;
  const completitud_pct = Math.round((filled / totalSlots) * 100);

  return {
    accion_id: accion.id,
    folio: accion.folio,
    nombre: accion.nombre,
    discrepancias,
    completitud_pct,
  };
}

export function validatePortfolioIdp(
  acciones: Array<{
    accion: Pick<Accion, 'id' | 'folio' | 'nombre' | 'montoContratado' | 'montoAutorizado'>;
    documentos: Pick<Documento, 'categoria' | 'estatus' | 'fechaCarga' | 'nombre'>[];
    estimaciones: Pick<Estimacion, 'montoEstimado' | 'estatus'>[];
  }>,
): IdpPortfolioReport {
  const reports = acciones.map(({ accion, documentos, estimaciones }) =>
    validateAccionIdp(accion, documentos, estimaciones),
  );
  return {
    acciones_revisadas: reports.length,
    total_discrepancias: reports.reduce((s, r) => s + r.discrepancias.length, 0),
    acciones: reports.filter((r) => r.discrepancias.length > 0 || r.completitud_pct < 100),
  };
}
