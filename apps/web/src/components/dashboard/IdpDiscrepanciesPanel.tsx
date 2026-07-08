import { useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileSearch, RefreshCw } from 'lucide-react';
import { fetchIdpByAccion, runIdpAccion, type IdpAccionReport } from '@/lib/api';
import { useAsyncData } from '@/hooks/use-async-data';
import { toast } from 'sonner';

interface IdpDiscrepanciesPanelProps {
  accionId: string;
}

const severityVariant = (s: string) =>
  s === 'alta' ? 'destructive' : s === 'media' ? 'secondary' : 'outline';

export function IdpDiscrepanciesPanel({ accionId }: IdpDiscrepanciesPanelProps) {
  const [running, setRunning] = useState(false);

  const load = useCallback(() => fetchIdpByAccion(accionId), [accionId]);
  const { data, loading, error, reload } = useAsyncData(load, [load]);

  const handleRun = async () => {
    setRunning(true);
    try {
      await runIdpAccion(accionId);
      toast.success('Validación IDP ejecutada');
      reload();
    } catch {
      toast.error('No se pudo ejecutar la validación IDP');
    } finally {
      setRunning(false);
    }
  };

  const report = data as IdpAccionReport | null;

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <FileSearch className="w-4 h-4" />
          Validación documental (IDP)
        </CardTitle>
        <Button type="button" size="sm" variant="outline" className="gap-1 h-8" onClick={handleRun} disabled={running}>
          <RefreshCw className={`w-3 h-3 ${running ? 'animate-spin' : ''}`} />
          Validar
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && <p className="text-xs text-gray-500">Analizando expediente…</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
        {report && (
          <>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Completitud documental</span>
              <span className="font-bold text-brand-primary">{report.completitud_pct}%</span>
            </div>
            {report.discrepancias.length === 0 ? (
              <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-md p-2">
                Sin discrepancias detectadas en categorías obligatorias ni montos.
              </p>
            ) : (
              <ul className="space-y-2">
                {report.discrepancias.map((d) => (
                  <li key={d.codigo} className="text-xs border border-gray-100 rounded-md p-2">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-medium text-gray-800">{d.titulo}</span>
                      <Badge variant={severityVariant(d.severidad)}>{d.severidad}</Badge>
                    </div>
                    <p className="text-gray-600">{d.descripcion}</p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
