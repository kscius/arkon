import { useCallback, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
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
import { getBrand } from '@/config/brand';
import { useApp } from '@/context/AppContext';
import { useAsyncData } from '@/hooks/use-async-data';
import {
  createCofinanciamiento,
  deleteCofinanciamiento,
  fetchCofinanciamientosByObra,
  updateCofinanciamiento,
} from '@/lib/api';
import { canEditCofinanciamiento } from '@/lib/proagua-access';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { toast } from 'sonner';
import type { Cofinanciamiento, CofinanciamientoFuente } from '@/types';

const FUENTE_LABELS: Record<string, string> = {
  federal: 'Federal',
  estatal: 'Estatal',
  municipal: 'Municipal',
  organismo_operador: 'Organismo Operador (OO)',
  otro: 'Otro',
};

const FUENTE_COLORS: Record<string, string> = {
  federal: '#1B3664',
  estatal: '#2A6F97',
  municipal: '#3B83BD',
  organismo_operador: '#C5A059',
  otro: '#718096',
};

const FUENTE_ORDER: CofinanciamientoFuente[] = [
  'federal',
  'estatal',
  'municipal',
  'organismo_operador',
];

interface CofinanciamientoTableProps {
  obraId: string;
}

export function CofinanciamientoTable({ obraId }: CofinanciamientoTableProps) {
  const { entity } = getBrand();
  const { user } = useApp();
  const canEdit = canEditCofinanciamiento(user);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fuente, setFuente] = useState('federal');
  const [monto, setMonto] = useState('');
  const [porcentaje, setPorcentaje] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const rows = await fetchCofinanciamientosByObra(obraId);
    const sorted = [...rows].sort((a, b) => {
      const ia = FUENTE_ORDER.indexOf(a.fuente as CofinanciamientoFuente);
      const ib = FUENTE_ORDER.indexOf(b.fuente as CofinanciamientoFuente);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    const total = sorted.reduce((s, r) => s + r.monto, 0);
    return { rows: sorted, total };
  }, [obraId]);

  const { data, loading, error, reload } = useAsyncData(load, [load]);

  const openCreate = () => {
    setEditingId(null);
    setFuente('federal');
    setMonto('');
    setPorcentaje('');
    setDescripcion('');
    setDialogOpen(true);
  };

  const openEdit = (row: Cofinanciamiento) => {
    setEditingId(row.id);
    setFuente(row.fuente);
    setMonto(String(row.monto));
    setPorcentaje(String(row.porcentaje));
    setDescripcion(row.descripcion ?? '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const montoNum = Number(monto);
    if (!montoNum || montoNum <= 0) {
      toast.error('Ingrese un monto valido');
      return;
    }
    setSaving(true);
    try {
      const body = {
        fuente,
        monto: montoNum,
        porcentaje: porcentaje ? Number(porcentaje) : undefined,
        descripcion: descripcion.trim() || undefined,
      };
      if (editingId) {
        await updateCofinanciamiento(editingId, obraId, body);
        toast.success('Cofinanciamiento actualizado');
      } else {
        await createCofinanciamiento(obraId, body);
        toast.success('Fuente agregada');
      }
      setDialogOpen(false);
      reload();
    } catch {
      toast.error('No se pudo guardar el cofinanciamiento');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCofinanciamiento(id);
      toast.success('Registro eliminado');
      reload();
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Cofinanciamiento</CardTitle>
        </CardHeader>
        <CardContent>
          <PageState loading={loading} error={error} onRetry={reload}>
            <span />
          </PageState>
        </CardContent>
      </Card>
    );
  }

  const { rows, total } = data;

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold">Cofinanciamiento por Fuente</CardTitle>
        {canEdit && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={openCreate}>
            <Plus className="w-3 h-3 mr-1" />
            Agregar
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-xs text-gray-500 py-4 text-center">
            No hay registros de cofinanciamiento para esta {entity.singular}.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-medium text-gray-500">Fuente</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-500">Monto (MXN)</th>
                  <th className="text-center py-2 px-2 font-medium text-gray-500">%</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-500">Descripcion</th>
                  {canEdit && (
                    <th className="text-right py-2 px-2 font-medium text-gray-500">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-2">
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                        style={{ backgroundColor: FUENTE_COLORS[row.fuente] ?? '#718096' }}
                      >
                        {FUENTE_LABELS[row.fuente] ?? row.fuente}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right font-medium">{formatCurrency(row.monto)}</td>
                    <td className="py-2 px-2 text-center">{formatPercentage(row.porcentaje)}</td>
                    <td className="py-2 px-2 text-gray-600">{row.descripcion ?? '—'}</td>
                    {canEdit && (
                      <td className="py-2 px-2 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => openEdit(row)}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-red-600"
                            onClick={() => void handleDelete(row.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td className="py-2 px-2 font-semibold text-gray-900">Total</td>
                  <td className="py-2 px-2 text-right font-semibold text-brand-primary">
                    {formatCurrency(total)}
                  </td>
                  <td className="py-2 px-2 text-center font-semibold">100%</td>
                  <td colSpan={canEdit ? 2 : 1} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {editingId ? 'Editar cofinanciamiento' : 'Agregar fuente'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-gray-500 uppercase">Fuente</label>
              <select
                value={fuente}
                onChange={(e) => setFuente(e.target.value)}
                disabled={!!editingId}
                className="mt-1 w-full h-9 px-2 text-xs border border-gray-200 rounded-md"
              >
                {FUENTE_ORDER.map((f) => (
                  <option key={f} value={f}>
                    {FUENTE_LABELS[f]}
                  </option>
                ))}
                <option value="otro">{FUENTE_LABELS.otro}</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-500 uppercase">Monto (MXN)</label>
                <input
                  type="number"
                  min={0}
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="mt-1 w-full h-9 px-2 text-xs border border-gray-200 rounded-md"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase">Porcentaje</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={porcentaje}
                  onChange={(e) => setPorcentaje(e.target.value)}
                  className="mt-1 w-full h-9 px-2 text-xs border border-gray-200 rounded-md"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase">Descripcion</label>
              <input
                type="text"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="mt-1 w-full h-9 px-2 text-xs border border-gray-200 rounded-md"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" disabled={saving} onClick={() => void handleSave()}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
