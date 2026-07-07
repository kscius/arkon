import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Inbox } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageState } from '@/components/PageState';
import { PendienteRow } from '@/components/PendienteRow';
import { useAsyncData } from '@/hooks/use-async-data';
import { fetchPendientes } from '@/lib/api';
import { SUMMARY_ORDER, TIPO_META } from '@/lib/pendientes-meta';

export function PendingActionsInbox() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsyncData(fetchPendientes, []);

  const handleResolve = (enlace: string) => navigate(enlace);

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
            <div className="flex shrink-0 items-center gap-2">
              <Badge className="bg-brand-primary text-white hover:bg-brand-primary">
                {data.total} pendiente{data.total === 1 ? '' : 's'}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-brand-primary"
                onClick={() => navigate('/bandeja')}
              >
                Ver todas las acciones
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
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
                {data?.items.slice(0, 6).map((item, index) => (
                  <PendienteRow
                    key={`${item.tipo}-${item.id}`}
                    item={item}
                    index={index}
                    onResolve={handleResolve}
                    onResolved={reload}
                  />
                ))}
              </ul>
              {data && data.total > 6 && (
                <div className="text-center">
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs text-gray-500 hover:text-brand-primary"
                    onClick={() => navigate('/bandeja')}
                  >
                    +{data.total - 6} más
                  </Button>
                </div>
              )}
            </div>
          )}
        </PageState>
      </CardContent>
    </Card>
  );
}
