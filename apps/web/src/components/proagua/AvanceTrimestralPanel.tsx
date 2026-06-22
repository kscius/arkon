import { useCallback, useState } from 'react';
import { Download } from 'lucide-react';
import { PageState } from '@/components/PageState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAsyncData } from '@/hooks/use-async-data';
import { downloadProaguaExport, fetchAvancesTrimestralesByObra } from '@/lib/api';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { toast } from 'sonner';

const TRIMESTRE_LABELS = ['', 'T1 (Ene–Mar)', 'T2 (Abr–Jun)', 'T3 (Jul–Sep)', 'T4 (Oct–Dic)'];

const ESTATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  validado: { bg: '#38A16915', color: '#38A169', label: 'Validado' },
  en_revision: { bg: '#D69E2E15', color: '#D69E2E', label: 'En revision' },
  observado: { bg: '#DC262615', color: '#DC2626', label: 'Observado' },
  pendiente: { bg: '#A0AEC015', color: '#A0AEC0', label: 'Pendiente' },
};

interface AvanceTrimestralPanelProps {
  obraId: string;
  ejercicioFiscal?: number;
}

export function AvanceTrimestralPanel({ obraId, ejercicioFiscal }: AvanceTrimestralPanelProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadProaguaExport('anexo-xviii', obraId);
      toast.success('Anexo XVIII descargado');
    } catch {
      toast.error('No se pudo exportar el informe trimestral');
    } finally {
      setExporting(false);
    }
  };

  const load = useCallback(async () => {
    const rows = await fetchAvancesTrimestralesByObra(obraId);
    const filtered = ejercicioFiscal
      ? rows.filter((r) => r.ejercicioFiscal === ejercicioFiscal)
      : rows;
    return filtered.sort((a, b) => {
      if (a.ejercicioFiscal !== b.ejercicioFiscal) return b.ejercicioFiscal - a.ejercicioFiscal;
      return a.trimestre - b.trimestre;
    });
  }, [obraId, ejercicioFiscal]);

  const { data, loading, error, reload } = useAsyncData(load, [load]);

  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Avances Trimestrales (Anexo XVIII)</CardTitle>
        </CardHeader>
        <CardContent>
          <PageState loading={loading} error={error} onRetry={reload}>
            <span />
          </PageState>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">Avances Trimestrales (Anexo XVIII)</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-[10px]"
            disabled={exporting}
            onClick={() => void handleExport()}
          >
            <Download className="w-3 h-3 mr-1" />
            {exporting ? 'Exportando...' : 'Exportar XVIII'}
          </Button>
        </div>
        {ejercicioFiscal && (
          <p className="text-[10px] text-gray-500">Ejercicio fiscal {ejercicioFiscal}</p>
        )}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-xs text-gray-500 py-4 text-center">
            Sin avances trimestrales registrados.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.map((av) => {
              const est = ESTATUS_STYLES[av.estatus] ?? ESTATUS_STYLES.pendiente;
              return (
                <div
                  key={av.id}
                  className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-brand-primary">
                        {TRIMESTRE_LABELS[av.trimestre] ?? `T${av.trimestre}`}
                      </span>
                      <span className="text-[10px] text-gray-400">EF {av.ejercicioFiscal}</span>
                    </div>
                    <Badge
                      className="text-[9px]"
                      style={{ backgroundColor: est.bg, color: est.color }}
                    >
                      {est.label}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <div className="text-gray-400 uppercase tracking-wider mb-0.5">Fisico acum.</div>
                      <div className="font-semibold text-gray-900">
                        {formatPercentage(av.avanceFisicoAcumulado)}
                      </div>
                      <div className="text-gray-500 mt-0.5">
                        Trimestre: {formatPercentage(av.avanceFisicoTrimestre)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 uppercase tracking-wider mb-0.5">Financiero acum.</div>
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(av.avanceFinAcumulado)}
                      </div>
                      <div className="text-gray-500 mt-0.5">
                        Trimestre: {formatCurrency(av.avanceFinTrimestre)}
                      </div>
                    </div>
                  </div>
                  {av.fechaEntrega && (
                    <p className="text-[10px] text-gray-400 mt-2">Entrega: {av.fechaEntrega}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
