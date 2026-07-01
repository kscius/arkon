import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  Bell,
  CheckCircle2,
  ChevronRight,
  DollarSign,
  FileText,
  Folder,
  Inbox,
  MessageSquare,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageState } from '@/components/PageState';
import { useAsyncData } from '@/hooks/use-async-data';
import { fetchPendientes } from '@/lib/api';
import type { PendienteItem, PendienteTipo, PendientesTotales } from '@/lib/api';
import { formatDate } from '@/lib/utils';

const TIPO_META: Record<PendienteTipo, { label: string; icon: LucideIcon }> = {
  avance: { label: 'Avance', icon: Activity },
  estimacion: { label: 'Estimación', icon: DollarSign },
  documento: { label: 'Documento', icon: Folder },
  observacion: { label: 'Observación', icon: MessageSquare },
  alerta: { label: 'Alerta', icon: Bell },
  solicitud: { label: 'Solicitud', icon: FileText },
};

const SUMMARY_ORDER: { key: keyof PendientesTotales; tipo: PendienteTipo }[] = [
  { key: 'alertas', tipo: 'alerta' },
  { key: 'avances', tipo: 'avance' },
  { key: 'estimaciones', tipo: 'estimacion' },
  { key: 'documentos', tipo: 'documento' },
  { key: 'observaciones', tipo: 'observacion' },
  { key: 'solicitudes', tipo: 'solicitud' },
];

const SEVERITY_STRIPE: Record<PendienteItem['severidad'], string> = {
  alta: 'bg-red-500',
  media: 'bg-amber-500',
  baja: 'bg-gray-300',
};

export function PendingActionsInbox() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsyncData(fetchPendientes, []);

  return (
    <Card className="border-brand-primary/15 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
              <Inbox className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base text-brand-primary">Acciones pendientes</CardTitle>
              <p className="text-xs text-gray-500">Lo que requiere tu atención hoy</p>
            </div>
          </div>
          {data && data.total > 0 && (
            <Badge className="bg-brand-primary text-white hover:bg-brand-primary">
              {data.total} pendiente{data.total === 1 ? '' : 's'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <PageState loading={loading} error={error} onRetry={reload}>
          {data && data.total === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="text-sm font-medium text-gray-700">Todo al día</p>
              <p className="text-xs text-gray-500">No tienes acciones pendientes por resolver.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {SUMMARY_ORDER.filter(({ key }) => (data?.totales[key] ?? 0) > 0).map(({ key, tipo }) => {
                  const Icon = TIPO_META[tipo].icon;
                  return (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-brand-surface px-2.5 py-1 text-xs text-gray-700"
                    >
                      <Icon className="h-3.5 w-3.5 text-brand-primary-light" />
                      <span className="font-semibold">{data?.totales[key]}</span>
                      {TIPO_META[tipo].label}
                    </span>
                  );
                })}
              </div>

              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                {data?.items.map((item, index) => {
                  const Icon = TIPO_META[item.tipo].icon;
                  return (
                    <motion.li
                      key={`${item.tipo}-${item.id}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.3) }}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-brand-surface/60"
                    >
                      <span className={`h-9 w-1 shrink-0 rounded-full ${SEVERITY_STRIPE[item.severidad]}`} />
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-primary/5 text-brand-primary">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-gray-900">{item.titulo}</p>
                          <Badge variant="outline" className="hidden shrink-0 text-[10px] sm:inline-flex">
                            {TIPO_META[item.tipo].label}
                          </Badge>
                        </div>
                        <p className="truncate text-xs text-gray-500">
                          {[item.accionFolio, item.accionNombre ?? item.descripcion, item.municipio]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                      {item.fecha && (
                        <span className="hidden shrink-0 text-[11px] text-gray-400 md:inline">
                          {formatDate(item.fecha)}
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0 gap-1 text-brand-primary hover:bg-brand-primary/10"
                        onClick={() => navigate(item.enlace)}
                      >
                        Resolver
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          )}
        </PageState>
      </CardContent>
    </Card>
  );
}
