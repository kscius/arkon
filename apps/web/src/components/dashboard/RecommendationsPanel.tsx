import { useCallback } from 'react';
import { PageState } from '@/components/PageState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAsyncData } from '@/hooks/use-async-data';
import { approveRecommendation, fetchRecommendations } from '@/lib/api';
import { toast } from 'sonner';
import { Sparkles, CheckCircle2 } from 'lucide-react';

export function RecommendationsPanel() {
  const load = useCallback(() => fetchRecommendations(), []);
  const { data, loading, error, reload } = useAsyncData(load, [load]);

  const handleApprove = async (id: string) => {
    try {
      await approveRecommendation(id);
      toast.success('Recomendación aprobada');
      reload();
    } catch {
      toast.error('No se pudo aprobar');
    }
  };

  return (
    <PageState loading={loading} error={error} onRetry={reload}>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Recomendaciones priorizadas (HITL)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(data ?? []).length === 0 && (
            <p className="text-sm text-gray-500">Sin recomendaciones pendientes.</p>
          )}
          {(data ?? []).map((rec, index) => {
            const r = rec as {
              id: string;
              titulo: string;
              descripcion: string;
              prioridad: string;
              estatus: string;
              accion?: { folio?: string };
            };
            return (
              <div key={`${r.id}-${index}`} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{r.titulo}</p>
                    {r.accion?.folio && (
                      <p className="text-xs text-gray-500">Obra: {r.accion.folio}</p>
                    )}
                  </div>
                  <Badge variant={r.prioridad === 'alta' ? 'destructive' : 'secondary'}>
                    {r.prioridad}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600">{r.descripcion}</p>
                {r.estatus === 'pendiente' && (
                  <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => handleApprove(r.id)}>
                    <CheckCircle2 className="w-3 h-3" />
                    Aprobar
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </PageState>
  );
}
