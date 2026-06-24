import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrencyM(amount: number): string {
  const millones = amount / 1000000;
  return `$${millones.toFixed(1)}M`;
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatDateLong(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('es-MX').format(num);
}

export function getProgressColor(value: number): string {
  if (value < 40) return '#DC2626';
  if (value < 80) return '#D69E2E';
  return '#38A169';
}

export function getObraStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'en_ejecucion_a_tiempo': '#38A169',
    'en_ejecucion_retraso': '#DD6B20',
    'concluida': '#2B6CB0',
    'en_riesgo': '#E53E3E',
    'en_preparacion': '#4A5568',
    'en_revision': '#3182CE',
    'suspendida': '#718096',
    'en_adjudicacion': '#68D391',
    'en_licitacion': '#805AD5',
    'cancelada': '#2D3748',
    'cerrada': '#276749',
  };
  return colors[status] || '#718096';
}

export function getObraStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'en_ejecucion_a_tiempo': 'En ejecución',
    'en_ejecucion_retraso': 'Con retraso',
    'concluida': 'Concluida',
    'en_riesgo': 'En riesgo',
    'en_preparacion': 'En preparación',
    'en_revision': 'En revisión',
    'suspendida': 'Suspendida',
    'en_adjudicacion': 'En adjudicación',
    'en_licitacion': 'En licitación',
    'cancelada': 'Cancelada',
    'cerrada': 'Cerrada',
  };
  return labels[status] || status;
}

export function getSeverityColor(sev: string): string {
  const colors: Record<string, string> = {
    'critica': '#E53E3E',
    'alta': '#DD6B20',
    'media': '#D69E2E',
    'baja': '#3182CE',
  };
  return colors[sev] || '#718096';
}

export function getSeverityLabel(sev: string): string {
  const labels: Record<string, string> = {
    'critica': 'Critica',
    'alta': 'Alta',
    'media': 'Media',
    'baja': 'Baja',
  };
  return labels[sev] || sev;
}

export function getRiesgoColor(nivel: string): string {
  const colors: Record<string, string> = {
    'bajo': '#38A169',
    'medio': '#D69E2E',
    'alto': '#DD6B20',
    'critico': '#E53E3E',
  };
  return colors[nivel] || '#718096';
}

export function getRiesgoLabel(nivel: string): string {
  const labels: Record<string, string> = {
    'bajo': 'Bajo',
    'medio': 'Medio',
    'alto': 'Alto',
    'critico': 'Crítico',
  };
  return labels[nivel] || nivel;
}

/** Convierte claves snake_case de BD a texto legible (fallback genérico). */
export function humanizeSnakeCase(value: string): string {
  if (!value) return '-';
  return value
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getAlertaTipoLabel(tipo: string): string {
  const labels: Record<string, string> = {
    retraso: 'Retraso',
    retraso_fisico: 'Retraso físico',
    documental: 'Documental',
    documentacion: 'Documentación',
    documentacion_incompleta: 'Documentación incompleta',
    financiera: 'Financiera',
    desvio_financiero: 'Desvío financiero',
    tecnica: 'Técnica',
    programa: 'Programa',
    presupuestaria: 'Presupuestaria',
    operativa: 'Operativa',
    logistica: 'Logística',
    regulatoria: 'Regulatoria',
    administrativa: 'Administrativa',
    climatica: 'Climática',
    plazo: 'Plazo',
    sin_actualizaciones: 'Sin actualizaciones',
    exceso_presupuesto: 'Exceso de presupuesto',
    sin_estimaciones: 'Sin estimaciones',
  };
  return labels[tipo] ?? humanizeSnakeCase(tipo);
}

export function getAlertaTipoColor(tipo: string): string {
  const colors: Record<string, string> = {
    retraso: '#DD6B20',
    retraso_fisico: '#DD6B20',
    documental: '#805AD5',
    documentacion: '#805AD5',
    documentacion_incompleta: '#805AD5',
    financiera: '#D69E2E',
    desvio_financiero: '#D69E2E',
    tecnica: '#3182CE',
    programa: '#2B6CB0',
    presupuestaria: '#D69E2E',
    operativa: '#4A5568',
    logistica: '#718096',
    regulatoria: '#E53E3E',
    administrativa: '#805AD5',
    climatica: '#3182CE',
    plazo: '#DD6B20',
  };
  return colors[tipo] ?? '#718096';
}

export function getTipoObraLabel(tipo: string): string {
  const labels: Record<string, string> = {
    'pavimentacion_urbana': 'Pavimentación',
    'infraestructura_educativa': 'Educación',
    'drenaje_saneamiento': 'Drenaje',
    'electrificacion': 'Electrificación',
    'agua_potable': 'Agua Potable',
    'espacios_publicos': 'Espacios Publicos',
    'salud': 'Salud',
    'proteccion_civil': 'Protección Civil',
    'infraestructura_comercial': 'Comercial',
    'patrimonio_cultural': 'Patrimonio',
    'puentes_vialidades': 'Puentes',
    'caminos_rurales': 'Caminos',
    'alumbrado_publico': 'Alumbrado',
  };
  return labels[tipo] || tipo;
}

import { getProgramaBrandColors } from '@/config/brand';

export function getProgramaColor(id: string): string {
  const colors = getProgramaBrandColors();
  const lower = id.toLowerCase();
  return colors[id] ?? colors[lower] ?? colors[id.toUpperCase()] ?? '#718096';
}

export function getProgramaName(id: string): string {
  const names: Record<string, string> = {
    fise: 'FISE',
    fism: 'FISM',
    fortamun: 'FORTAMUN',
    fais: 'FAIS',
    faeispum: 'FAEISPUM',
    pem: 'PEM',
    pds: 'PDS',
    'proteccion-civil': 'PPAD',
    PROAGUA: 'PROAGUA — Agua potable, drenaje y saneamiento',
    proagua: 'PROAGUA — Agua potable, drenaje y saneamiento',
    PEAS: 'PEAS — Fortalecimiento de entidades de agua y saneamiento',
    peas: 'PEAS — Fortalecimiento de entidades de agua y saneamiento',
    PRODDER: 'PRODDER — Devolución de derechos',
    prodder: 'PRODDER — Devolución de derechos',
  };
  return names[id] ?? names[id.toLowerCase()] ?? id;
}
