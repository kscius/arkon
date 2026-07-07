import type { ObraStatus } from '@/types';

/**
 * Transiciones válidas del ciclo de vida de una acción de programa.
 * Fuente de verdad: apps/api/src/obras/accion-estado.ts
 */
export const ESTATUS_TRANSICIONES: Record<ObraStatus, ObraStatus[]> = {
  en_preparacion: ['en_licitacion', 'cancelada'],
  en_licitacion: ['en_adjudicacion', 'cancelada'],
  en_adjudicacion: ['en_ejecucion_a_tiempo', 'cancelada'],
  en_ejecucion_a_tiempo: [
    'en_ejecucion_retraso',
    'en_riesgo',
    'en_revision',
    'suspendida',
    'concluida',
  ],
  en_ejecucion_retraso: [
    'en_ejecucion_a_tiempo',
    'en_riesgo',
    'en_revision',
    'suspendida',
    'concluida',
  ],
  en_riesgo: [
    'en_ejecucion_a_tiempo',
    'en_ejecucion_retraso',
    'suspendida',
    'en_revision',
  ],
  en_revision: ['en_ejecucion_a_tiempo', 'en_ejecucion_retraso', 'concluida'],
  suspendida: ['en_ejecucion_a_tiempo', 'en_ejecucion_retraso', 'cancelada'],
  concluida: ['cerrada', 'en_revision'],
  cancelada: [],
  cerrada: [],
};

export function destinosValidos(desde: ObraStatus): ObraStatus[] {
  return ESTATUS_TRANSICIONES[desde] ?? [];
}
