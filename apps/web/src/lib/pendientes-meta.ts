import {
  Activity,
  Bell,
  CalendarClock,
  DollarSign,
  FileText,
  Folder,
  Landmark,
  MessageSquare,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PendienteItem, PendienteTipo, PendientesTotales } from '@/lib/api';

export const TIPO_META: Record<PendienteTipo, { label: string; icon: LucideIcon }> = {
  avance: { label: 'Avance', icon: Activity },
  estimacion: { label: 'Estimación', icon: DollarSign },
  documento: { label: 'Documento', icon: Folder },
  observacion: { label: 'Observación', icon: MessageSquare },
  alerta: { label: 'Alerta', icon: Bell },
  solicitud: { label: 'Solicitud', icon: FileText },
  idp: { label: 'IDP', icon: ShieldCheck },
  cierre: { label: 'Cierre', icon: Landmark },
  avance_trimestral: { label: 'Avance trim.', icon: CalendarClock },
  recomendacion: { label: 'Recomendación', icon: Sparkles },
};

export const SUMMARY_ORDER: { key: keyof PendientesTotales; tipo: PendienteTipo }[] = [
  { key: 'alertas', tipo: 'alerta' },
  { key: 'avances', tipo: 'avance' },
  { key: 'avances_trimestrales', tipo: 'avance_trimestral' },
  { key: 'estimaciones', tipo: 'estimacion' },
  { key: 'documentos', tipo: 'documento' },
  { key: 'observaciones', tipo: 'observacion' },
  { key: 'solicitudes', tipo: 'solicitud' },
  { key: 'idp', tipo: 'idp' },
  { key: 'cierres', tipo: 'cierre' },
  { key: 'recomendaciones', tipo: 'recomendacion' },
];

export const SEVERITY_STRIPE: Record<PendienteItem['severidad'], string> = {
  alta: 'bg-red-500',
  media: 'bg-amber-500',
  baja: 'bg-gray-300',
};

/** Accent stripe by activity type — avoids treating every open observación as critical. */
export const TIPO_STRIPE: Record<PendienteTipo, string> = {
  alerta: 'bg-red-500',
  observacion: 'bg-sky-500',
  solicitud: 'bg-amber-500',
  documento: 'bg-violet-500',
  estimacion: 'bg-emerald-500',
  avance: 'bg-teal-500',
  avance_trimestral: 'bg-cyan-500',
  idp: 'bg-indigo-500',
  cierre: 'bg-slate-500',
  recomendacion: 'bg-fuchsia-500',
};

export function getPendienteStripe(item: PendienteItem): string {
  if (item.tipo === 'alerta') {
    return SEVERITY_STRIPE[item.severidad];
  }
  return TIPO_STRIPE[item.tipo];
}
