import { useCallback, useState } from 'react';
import { Download, FileStack, Plus } from 'lucide-react';
import { PageState } from '@/components/PageState';
import { OrganismoOperadorSelect } from '@/components/proagua/OrganismoOperadorSelect';
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
  createAnexoEjecucion,
  createAnexoTecnico,
  downloadProaguaExport,
  fetchAnexosEjecucion,
  fetchAnexosTecnicos,
  fetchEntidadesFederativas,
} from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import type { AnexoEjecucion } from '@/types';

export default function AnexosPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [tecnicoOpen, setTecnicoOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const [numero, setNumero] = useState('');
  const [ejercicio, setEjercicio] = useState(new Date().getFullYear());
  const [entidad, setEntidad] = useState('');
  const [montoFederal, setMontoFederal] = useState('');
  const [montoEstatal, setMontoEstatal] = useState('');

  const [ooId, setOoId] = useState('');
  const [tipoLocalidad, setTipoLocalidad] = useState('urbana');
  const [tecnicoEjercicio, setTecnicoEjercicio] = useState(new Date().getFullYear());

  const loadAnexos = useCallback(() => fetchAnexosEjecucion(), []);
  const { data: anexos, loading, error, reload } = useAsyncData(loadAnexos, [loadAnexos]);

  const loadTecnicos = useCallback(async () => {
    if (!selectedId) return [];
    return fetchAnexosTecnicos(selectedId);
  }, [selectedId]);
  const {
    data: tecnicos,
    loading: tecnicosLoading,
    reload: reloadTecnicos,
  } = useAsyncData(loadTecnicos, [selectedId, loadTecnicos]);

  const loadEntidades = useCallback(() => fetchEntidadesFederativas(), []);
  const { data: entidades } = useAsyncData(loadEntidades, [loadEntidades]);

  const selected = anexos?.find((a) => a.id === selectedId) ?? null;

  const handleCreateAnexo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numero.trim() || !entidad.trim()) {
      toast.error('Complete número y entidad federativa.');
      return;
    }
    try {
      const created = await createAnexoEjecucion({
        numero: numero.trim(),
        ejercicio_fiscal: ejercicio,
        entidad_federativa: entidad.trim(),
        monto_federal: Number(montoFederal) || 0,
        monto_estatal: Number(montoEstatal) || 0,
        estatus: 'vigente',
      });
      toast.success('Anexo XII registrado');
      setCreateOpen(false);
      setSelectedId(created.id);
      reload();
    } catch {
      toast.error('No se pudo crear el anexo de ejecución');
    }
  };

  const handleCreateTecnico = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    try {
      await createAnexoTecnico(selectedId, {
        organismo_operador_id: ooId || undefined,
        ejercicio_fiscal: tecnicoEjercicio,
        tipo_localidad: tipoLocalidad,
        estatus: 'vigente',
      });
      toast.success('Anexo XIII registrado');
      setTecnicoOpen(false);
      reloadTecnicos();
    } catch {
      toast.error('No se pudo crear el anexo tecnico');
    }
  };

  const handleExportXiii = async (tecnicoId: string) => {
    setExporting(tecnicoId);
    try {
      await downloadProaguaExport('anexo-xiii', tecnicoId);
      toast.success('Anexo XIII descargado');
    } catch {
      toast.error('Error al exportar Anexo XIII');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-brand-primary flex items-center gap-2">
            <FileStack className="w-5 h-5" />
            Anexos XII y XIII
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Formalización de ejecución (XII) y anexos técnicos por organismo operador (XIII)
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Nuevo Anexo XII
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Anexos de Ejecución (XII)</CardTitle>
          </CardHeader>
          <CardContent>
            <PageState loading={loading} error={error} onRetry={reload}>
              {!anexos?.length ? (
                <p className="text-xs text-gray-500 text-center py-6">Sin anexos registrados.</p>
              ) : (
                <div className="space-y-2">
                  {anexos.map((a: AnexoEjecucion) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelectedId(a.id)}
                      className={`w-full text-left border rounded-lg p-3 transition-colors ${
                        selectedId === a.id
                          ? 'border-brand-primary bg-brand-primary/5'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="text-xs font-semibold text-gray-900">{a.numero}</div>
                          <div className="text-[10px] text-gray-500">
                            {a.entidadFederativa} · EF {a.ejercicioFiscal}
                          </div>
                        </div>
                        <span className="text-[10px] uppercase text-gray-400">{a.estatus}</span>
                      </div>
                      <div className="text-[10px] text-gray-600 mt-1">
                        Federal {formatCurrency(a.montoFederal)} · Estatal{' '}
                        {formatCurrency(a.montoEstatal)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </PageState>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Anexos Técnicos (XIII)</CardTitle>
            {selected && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setTecnicoOpen(true)}>
                <Plus className="w-3 h-3 mr-1" />
                Agregar XIII
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!selected ? (
              <p className="text-xs text-gray-500 text-center py-8">
                Seleccione un Anexo XII para ver sus anexos técnicos.
              </p>
            ) : (
              <PageState loading={tecnicosLoading} error={null} onRetry={reloadTecnicos}>
                {!tecnicos?.length ? (
                  <p className="text-xs text-gray-500 text-center py-6">
                    Sin anexos técnicos para {selected.numero}.
                  </p>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-1 font-medium text-gray-500">OO</th>
                        <th className="text-center py-2 px-1 font-medium text-gray-500">EF</th>
                        <th className="text-center py-2 px-1 font-medium text-gray-500">Localidad</th>
                        <th className="text-right py-2 px-1 font-medium text-gray-500">Export</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tecnicos.map((t) => (
                        <tr key={t.id} className="border-b border-gray-100">
                          <td className="py-2 px-1">{t.organismoOperadorNombre || '—'}</td>
                          <td className="py-2 px-1 text-center">{t.ejercicioFiscal}</td>
                          <td className="py-2 px-1 text-center capitalize">{t.tipoLocalidad}</td>
                          <td className="py-2 px-1 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[10px]"
                              disabled={exporting === t.id}
                              onClick={() => void handleExportXiii(t.id)}
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </PageState>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Anexo de Ejecución (XII)</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void handleCreateAnexo(e)} className="space-y-3">
            <div>
              <label className="text-xs text-gray-500">Número</label>
              <input
                className="w-full h-9 px-2 text-sm border rounded-md"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="AE-GTO-2026-001"
              />
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
                <label className="text-xs text-gray-500">Entidad federativa</label>
                <select
                  className="w-full h-9 px-2 text-sm border rounded-md"
                  value={entidad}
                  onChange={(e) => setEntidad(e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  {entidades?.map((en) => (
                    <option key={en.id} value={en.nombre}>
                      {en.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Monto federal</label>
                <input
                  type="number"
                  className="w-full h-9 px-2 text-sm border rounded-md"
                  value={montoFederal}
                  onChange={(e) => setMontoFederal(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Monto estatal</label>
                <input
                  type="number"
                  className="w-full h-9 px-2 text-sm border rounded-md"
                  value={montoEstatal}
                  onChange={(e) => setMontoEstatal(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Registrar Anexo XII</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={tecnicoOpen} onOpenChange={setTecnicoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Anexo Técnico (XIII)</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void handleCreateTecnico(e)} className="space-y-3">
            <div>
              <label className="text-xs text-gray-500">Organismo operador</label>
              <OrganismoOperadorSelect value={ooId} onValueChange={setOoId} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Ejercicio fiscal</label>
                <input
                  type="number"
                  className="w-full h-9 px-2 text-sm border rounded-md"
                  value={tecnicoEjercicio}
                  onChange={(e) => setTecnicoEjercicio(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Tipo localidad</label>
                <select
                  className="w-full h-9 px-2 text-sm border rounded-md"
                  value={tipoLocalidad}
                  onChange={(e) => setTipoLocalidad(e.target.value)}
                >
                  <option value="urbana">Urbana</option>
                  <option value="rural">Rural</option>
                  <option value="indigena">Indígena</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Registrar Anexo XIII</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
