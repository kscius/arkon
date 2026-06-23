import { useCallback, useState } from 'react';
import { Download, Plus } from 'lucide-react';
import { PageState } from '@/components/PageState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useApp } from '@/context/AppContext';
import { useAsyncData } from '@/hooks/use-async-data';
import {
  createAvanceTrimestral,
  downloadProaguaExport,
  fetchAvancesTrimestralesByObra,
  updateAvanceTrimestral,
} from '@/lib/api';
import { canCaptureTrimestral, canValidateTrimestral } from '@/lib/proagua-access';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { toast } from 'sonner';
import type { AvanceTrimestral } from '@/types';

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
  const { user } = useApp();
  const [exporting, setExporting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [trimestre, setTrimestre] = useState(1);
  const [ef, setEf] = useState(ejercicioFiscal ?? new Date().getFullYear());
  const [fisTri, setFisTri] = useState('');
  const [fisAcum, setFisAcum] = useState('');
  const [finTri, setFinTri] = useState('');
  const [finAcum, setFinAcum] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState('');

  const canCapture = canCaptureTrimestral(user);
  const canValidate = canValidateTrimestral(user);

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAvanceTrimestral(obraId, {
        ejercicio_fiscal: ef,
        trimestre,
        avance_fisico_trimestre: Number(fisTri) || 0,
        avance_fisico_acumulado: Number(fisAcum) || 0,
        avance_fin_trimestre: Number(finTri) || 0,
        avance_fin_acumulado: Number(finAcum) || 0,
        fecha_entrega: fechaEntrega || undefined,
        observaciones: 'Captura desde ARKON',
      });
      toast.success('Avance trimestral registrado');
      setFormOpen(false);
      reload();
    } catch {
      toast.error('No se pudo registrar el avance trimestral');
    }
  };

  const updateEstatus = async (av: AvanceTrimestral, estatus: string) => {
    setBusyId(av.id);
    try {
      await updateAvanceTrimestral(obraId, av.id, { estatus });
      toast.success('Estatus actualizado');
      reload();
    } catch {
      toast.error('No se pudo actualizar el estatus');
    } finally {
      setBusyId(null);
    }
  };

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
          <div className="flex items-center gap-2">
            {canCapture && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[10px]"
                onClick={() => setFormOpen(true)}
              >
                <Plus className="w-3 h-3 mr-1" />
                Capturar
              </Button>
            )}
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
              const busy = busyId === av.id;
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
                  {canValidate && av.estatus !== 'validado' && (
                    <div className="flex gap-1 mt-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[9px] px-2"
                        disabled={busy}
                        onClick={() => void updateEstatus(av, 'en_revision')}
                      >
                        CORESE
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[9px] px-2"
                        disabled={busy}
                        onClick={() => void updateEstatus(av, 'validado')}
                      >
                        Validar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[9px] px-2 text-red-600"
                        disabled={busy}
                        onClick={() => void updateEstatus(av, 'observado')}
                      >
                        Observar
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Capturar avance trimestral</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void handleCreate(e)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Ejercicio fiscal</label>
                <input
                  type="number"
                  className="w-full h-9 px-2 text-sm border rounded-md"
                  value={ef}
                  onChange={(e) => setEf(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Trimestre</label>
                <select
                  className="w-full h-9 px-2 text-sm border rounded-md"
                  value={trimestre}
                  onChange={(e) => setTrimestre(Number(e.target.value))}
                >
                  <option value={1}>T1</option>
                  <option value={2}>T2</option>
                  <option value={3}>T3</option>
                  <option value={4}>T4</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Avance fisico trimestre (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full h-9 px-2 text-sm border rounded-md"
                  value={fisTri}
                  onChange={(e) => setFisTri(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Avance fisico acumulado (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full h-9 px-2 text-sm border rounded-md"
                  value={fisAcum}
                  onChange={(e) => setFisAcum(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Avance financiero trimestre</label>
                <input
                  type="number"
                  className="w-full h-9 px-2 text-sm border rounded-md"
                  value={finTri}
                  onChange={(e) => setFinTri(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Avance financiero acumulado</label>
                <input
                  type="number"
                  className="w-full h-9 px-2 text-sm border rounded-md"
                  value={finAcum}
                  onChange={(e) => setFinAcum(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">Fecha de entrega</label>
              <input
                className="w-full h-9 px-2 text-sm border rounded-md"
                placeholder="DD-MM-YYYY"
                value={fechaEntrega}
                onChange={(e) => setFechaEntrega(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="submit">Guardar avance</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
