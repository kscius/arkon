import { EstatusAccion } from '@prisma/client';

/**
 * Transiciones válidas del ciclo de vida de una acción de programa (obra pública).
 * Estados terminales: cancelada, cerrada.
 */
export const ESTATUS_TRANSICIONES: Record<EstatusAccion, EstatusAccion[]> = {
  en_preparacion: [EstatusAccion.en_licitacion, EstatusAccion.cancelada],
  en_licitacion: [EstatusAccion.en_adjudicacion, EstatusAccion.cancelada],
  en_adjudicacion: [EstatusAccion.en_ejecucion_a_tiempo, EstatusAccion.cancelada],
  en_ejecucion_a_tiempo: [
    EstatusAccion.en_ejecucion_retraso,
    EstatusAccion.en_riesgo,
    EstatusAccion.en_revision,
    EstatusAccion.suspendida,
    EstatusAccion.concluida,
  ],
  en_ejecucion_retraso: [
    EstatusAccion.en_ejecucion_a_tiempo,
    EstatusAccion.en_riesgo,
    EstatusAccion.en_revision,
    EstatusAccion.suspendida,
    EstatusAccion.concluida,
  ],
  en_riesgo: [
    EstatusAccion.en_ejecucion_a_tiempo,
    EstatusAccion.en_ejecucion_retraso,
    EstatusAccion.suspendida,
    EstatusAccion.en_revision,
  ],
  en_revision: [
    EstatusAccion.en_ejecucion_a_tiempo,
    EstatusAccion.en_ejecucion_retraso,
    EstatusAccion.concluida,
  ],
  suspendida: [
    EstatusAccion.en_ejecucion_a_tiempo,
    EstatusAccion.en_ejecucion_retraso,
    EstatusAccion.cancelada,
  ],
  concluida: [EstatusAccion.cerrada, EstatusAccion.en_revision],
  cancelada: [],
  cerrada: [],
};

export function puedeTransicionar(desde: EstatusAccion, hacia: EstatusAccion): boolean {
  return ESTATUS_TRANSICIONES[desde].includes(hacia);
}

export function destinosValidos(desde: EstatusAccion): EstatusAccion[] {
  return ESTATUS_TRANSICIONES[desde];
}
