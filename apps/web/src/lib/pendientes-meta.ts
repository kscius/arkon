import {
  Activity,
  Bell,
  DollarSign,
  FileText,
  Folder,
  MessageSquare,
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
};

export const SUMMARY_ORDER: { key: keyof PendientesTotales; tipo: PendienteTipo }[] = [
  { key: 'alertas', tipo: 'alerta' },
  { key: 'avances', tipo: 'avance' },
  { key: 'estimaciones', tipo: 'estimacion' },
  { key: 'documentos', tipo: 'documento' },
  { key: 'observaciones', tipo: 'observacion' },
  { key: 'solicitudes', tipo: 'solicitud' },
];

export const SEVERITY_STRIPE: Record<PendienteItem['severidad'], string> = {
  alta: 'bg-red-500',
  media: 'bg-amber-500',
  baja: 'bg-gray-300',
};
