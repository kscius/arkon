import { useCallback, useState } from 'react';
import { Download, Landmark, Plus } from 'lucide-react';
import { PageState } from '@/components/PageState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAsyncData } from '@/hooks/use-async-data';
import {
  createCierreEjercicio,
  downloadProaguaExport,
  fetchAnexosEjecucion,
  fetchCierresEjercicio,
} from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export default function CierresEjercicioPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const [anexoId, setAnexoId] = useState('');
  const [ejercicio, setEjercicio] = useState(new Date().getFullYear());
  const [tipoApoyo, setTipoApoyo] = useState('infraestructura');
  const [montoTransferido, setMontoTransferido] = useState('');
  const [montoInformeFinal, setMontoInformeFinal] = useState('');
  const [montoReintegradoEj, setMontoReintegradoEj] = useState('');
  const [montoModificado31dic, setMontoModificado31dic] = useState('');
  const [montoReintegrado15ene, setMontoReintegrado15ene] = useState('');
  const [montoPorReintegrar, setMontoPorReintegrar] = useState('');

  const load = useCallback(() => fetchCierresEjercicio(), []);
  const { data, loading, error, reload } = useAsyncData(load, [load]);

  const loadAnexos = useCallback(() => fetchAnexosEjecucion(), []);
  const { data: anexos } = useAsyncData(loadAnexos, [loadAnexos]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!anexoId) {
      toast.error('Seleccione un Anexo XII.');
      return;
    }
    try {
      await createCierreEjercicio({
        anexo_ejecucion_id: anexoId,
        ejercicio_fiscal: ejercicio,
        tipo_apoyo: tipoApoyo,
        monto_transferido: Number(montoTransferido) || 0,
        monto_reintegrado_ejercicio: Number(montoReintegradoEj) || 0,
        monto_modificado_31dic: Number(montoModificado31dic) || 0,
        monto_informe_final: Number(montoInformeFinal) || 0,
        monto_reintegrado_15ene: Number(montoReintegrado15ene) || 0,
        monto_por_reintegrar: Number(montoPorReintegrar) || 0,
        estatus: 'pendiente',
      });
      toast.success('Cierre de ejercicio registrado');
      setCreateOpen(false);
      reload();
    } catch {
      toast.error('No se pudo registrar el cierre');
    }
  };

  const handleExport = async (anexoEjecucionId: string, cierreId: string) => {
    setExporting(cierreId);
    try {
      await downloadProaguaExport('anexo-xxii', anexoEjecucionId);
      toast.success('Anexo XXII descargado');
    } catch {
      toast.error('Error al exportar Anexo XXII');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-brand-primary flex items-center gap-2">
            <Landmark className="w-5 h-5" />
            Cierre de Ejercicio (Anexo XXII)
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Conciliación fiscal, informe final y reintegros post-ejercicio
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Nuevo cierre
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Registros de cierre</CardTitle>
        </CardHeader>
        <CardContent>
          <PageState loading={loading} error={error} onRetry={reload}>
            {!data?.length ? (
              <p className="text-xs text-gray-500 text-center py-8">Sin cierres registrados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 font-medium text-gray-500">Anexo XII</th>
                      <th className="text-center py-2 px-2 font-medium text-gray-500">EF</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-500">Tipo apoyo</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-500">Transferido</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-500">Por reintegrar</th>
                      <th className="text-center py-2 px-2 font-medium text-gray-500">Estatus</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-500">XXII</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((c) => (
                      <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-2 font-medium">{c.anexoEjecucionNumero || '—'}</td>
                        <td className="py-2 px-2 text-center">{c.ejercicioFiscal}</td>
                        <td className="py-2 px-2 capitalize">{c.tipoApoyo.replace(/_/g, ' ')}</td>
                        <td className="py-2 px-2 text-right">{formatCurrency(c.montoTransferido)}</td>
                        <td className="py-2 px-2 text-right">{formatCurrency(c.montoPorReintegrar)}</td>
                        <td className="py-2 px-2 text-center capitalize">{c.estatus}</td>
                        <td className="py-2 px-2 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7"
                            disabled={exporting === c.id}
                            aria-label={`Descargar Anexo XXII, ${c.anexoEjecucionNumero || 'cierre'} EF ${c.ejercicioFiscal}`}
                            onClick={() => void handleExport(c.anexoEjecucionId, c.id)}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </PageState>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar cierre de ejercicio</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void handleCreate(e)} className="space-y-3">
            <div>
              <label className="text-xs text-gray-500">Anexo XII vinculado</label>
              <select
                className="w-full h-9 px-2 text-sm border rounded-md"
                value={anexoId}
                onChange={(e) => setAnexoId(e.target.value)}
              >
                <option value="">Seleccionar...</option>
                {anexos?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.numero} — {a.entidadFederativa}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Ejercicio fiscal</label>
                <input
                  type="number"
                  className="w-full h-9 px-2 text-sm border rounded-md"
                  value={ejercicio}
                  onChange={(e) => setEjercicio(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Tipo de apoyo</label>
                <select
                  className="w-full h-9 px-2 text-sm border rounded-md"
                  value={tipoApoyo}
                  onChange={(e) => setTipoApoyo(e.target.value)}
                >
                  <option value="infraestructura">Infraestructura</option>
                  <option value="fortalecimiento">Fortalecimiento</option>
                  <option value="desinfeccion">Desinfección</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Monto transferido</label>
                <input
                  type="number"
                  className="w-full h-9 px-2 text-sm border rounded-md"
                  value={montoTransferido}
                  onChange={(e) => setMontoTransferido(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Reintegro en ejercicio</label>
                <input
                  type="number"
                  className="w-full h-9 px-2 text-sm border rounded-md"
                  value={montoReintegradoEj}
                  onChange={(e) => setMontoReintegradoEj(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Modificado al 31-dic</label>
                <input
                  type="number"
                  className="w-full h-9 px-2 text-sm border rounded-md"
                  value={montoModificado31dic}
                  onChange={(e) => setMontoModificado31dic(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Informe final</label>
                <input
                  type="number"
                  className="w-full h-9 px-2 text-sm border rounded-md"
                  value={montoInformeFinal}
                  onChange={(e) => setMontoInformeFinal(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Reintegro al 15-ene</label>
                <input
                  type="number"
                  className="w-full h-9 px-2 text-sm border rounded-md"
                  value={montoReintegrado15ene}
                  onChange={(e) => setMontoReintegrado15ene(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Por reintegrar</label>
                <input
                  type="number"
                  className="w-full h-9 px-2 text-sm border rounded-md"
                  value={montoPorReintegrar}
                  onChange={(e) => setMontoPorReintegrar(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Registrar cierre</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
