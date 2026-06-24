import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageState } from '@/components/PageState';
import { useApp } from '@/context/AppContext';
import { useAsyncData } from '@/hooks/use-async-data';
import { atenderAlerta, fetchAlertas, fetchObras } from '@/lib/api';
import { ApiError } from '@/lib/api-client';
import { toast } from 'sonner';
import { formatDate, getAlertaTipoColor, getAlertaTipoLabel, getSeverityColor, getSeverityLabel } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle, CheckCircle, Filter, Search } from 'lucide-react';
import type { Alerta } from '@/types';

export default function AlertasPage() {
  const navigate = useNavigate();
  const { user, refreshNotifications } = useApp();
  const canAtender = user?.role === 'estatal' || user?.role === 'municipal';

  const [filterSeveridad, setFilterSeveridad] = useState<string>('todas');
  const [filterTipo, setFilterTipo] = useState<string>('todas');
  const [filterEstado, setFilterEstado] = useState<'pendientes' | 'atendidas' | 'todas'>('pendientes');
  const [searchTerm, setSearchTerm] = useState('');
  const [atenderTarget, setAtenderTarget] = useState<Alerta | null>(null);
  const [accionText, setAccionText] = useState('');
  const [atenderBusy, setAtenderBusy] = useState(false);
  const [atenderError, setAtenderError] = useState<string | null>(null);

  const load = useCallback(
    () => Promise.all([fetchAlertas(), fetchObras()]),
    [],
  );

  const { data, loading, error, reload } = useAsyncData(load, [load]);

  const handleAtenderSubmit = async () => {
    if (!atenderTarget || !accionText.trim()) {
      setAtenderError('Describa la acción tomada.');
      return;
    }
    setAtenderBusy(true);
    setAtenderError(null);
    try {
      await atenderAlerta(atenderTarget.id, accionText.trim());
      toast.success('Alerta atendida');
      setAtenderTarget(null);
      setAccionText('');
      await refreshNotifications();
      reload();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo atender la alerta.';
      setAtenderError(msg);
      toast.error(msg);
    } finally {
      setAtenderBusy(false);
    }
  };

  if (!data) {
    return <PageState loading={loading} error={error} onRetry={reload}><span /></PageState>;
  }

  const [allAlertas, obras] = data;

  const alertas = allAlertas.filter((a) => {
    if (filterEstado === 'pendientes' && a.atendida) return false;
    if (filterEstado === 'atendidas' && !a.atendida) return false;
    if (filterSeveridad !== 'todas' && a.severidad !== filterSeveridad) return false;
    if (filterTipo !== 'todas' && a.tipo !== filterTipo) return false;
    if (
      searchTerm &&
      !a.titulo.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !a.municipio.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const tiposUnicos = [...new Set(allAlertas.map((a) => a.tipo))].sort();

  const criticas = allAlertas.filter((a) => a.severidad === 'critica' && !a.atendida).length;
  const altas = allAlertas.filter((a) => a.severidad === 'alta' && !a.atendida).length;
  const medias = allAlertas.filter((a) => a.severidad === 'media' && !a.atendida).length;
  const bajas = allAlertas.filter((a) => a.severidad === 'baja' && !a.atendida).length;
  const pendientesTotal = allAlertas.filter((a) => !a.atendida).length;

  const obraName = (obraId: string) => obras.find((o) => o.id === obraId)?.nombre ?? 'Obra';

  return (
    <PageState loading={loading} error={error} onRetry={reload}>
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-brand-primary">Centro de Alertas</h1>
        <p className="text-xs text-gray-500 mt-1">
          Monitoreo de alertas y notificaciones del sistema. Atender una alerta registra la acción tomada; las atendidas salen del contador pero pueden consultarse en el historial.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="text-[10px] text-red-600 uppercase font-medium">Críticas</div>
          <div className="text-2xl font-bold text-red-600">{criticas}</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="text-[10px] text-orange-600 uppercase font-medium">Altas</div>
          <div className="text-2xl font-bold text-orange-600">{altas}</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="text-[10px] text-yellow-600 uppercase font-medium">Medias</div>
          <div className="text-2xl font-bold text-yellow-600">{medias}</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-[10px] text-blue-600 uppercase font-medium">Bajas</div>
          <div className="text-2xl font-bold text-blue-600">{bajas}</div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Filter className="w-4 h-4" /> Filtros
            </CardTitle>
            <div className="flex flex-wrap gap-2 lg:ml-auto">
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value as 'pendientes' | 'atendidas' | 'todas')}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5"
              >
                <option value="pendientes">Pendientes ({pendientesTotal})</option>
                <option value="atendidas">Atendidas</option>
                <option value="todas">Todas</option>
              </select>
              <select
                value={filterSeveridad}
                onChange={(e) => setFilterSeveridad(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5"
              >
                <option value="todas">Todas las severidades</option>
                <option value="critica">Crítica</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
              <select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5"
              >
                <option value="todas">Todos los tipos</option>
                {tiposUnicos.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {getAlertaTipoLabel(tipo)}
                  </option>
                ))}
              </select>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg pl-7 pr-2 py-1.5 w-40"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alertas.map((alerta) => (
              <motion.div
                key={alerta.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`flex gap-3 p-4 rounded-lg border transition-colors cursor-pointer ${
                  alerta.atendida ? 'border-gray-100 bg-gray-50 opacity-70' : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => alerta.obraId && navigate(`/obras/${alerta.obraId}`)}
              >
                <div className="w-1 rounded-full flex-shrink-0" style={{ backgroundColor: getSeverityColor(alerta.severidad) }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{alerta.titulo}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {alerta.municipio} — {obraName(alerta.obraId)}
                      </p>
                    </div>
                    {alerta.atendida ? (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: getSeverityColor(alerta.severidad) }} />
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-2">{alerta.descripcion}</p>
                  {alerta.atendida && alerta.accionTomada && (
                    <p className="text-xs text-green-700 mt-2 bg-green-50 border border-green-100 rounded px-2 py-1.5">
                      <span className="font-medium">Acción tomada: </span>
                      {alerta.accionTomada}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge className="text-[10px]" style={{ backgroundColor: getAlertaTipoColor(alerta.tipo) + '20', color: getAlertaTipoColor(alerta.tipo) }}>
                      {getAlertaTipoLabel(alerta.tipo)}
                    </Badge>
                    <Badge className="text-[10px]" style={{ backgroundColor: getSeverityColor(alerta.severidad) + '20', color: getSeverityColor(alerta.severidad) }}>
                      {getSeverityLabel(alerta.severidad)}
                    </Badge>
                    <span className="text-[10px] text-gray-400">{formatDate(alerta.fechaGeneracion)}</span>
                    {canAtender && !alerta.atendida && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAtenderError(null);
                          setAccionText('');
                          setAtenderTarget(alerta);
                        }}
                        className="ml-auto text-[10px] font-medium text-brand-primary-light hover:underline"
                      >
                        Atender
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            {alertas.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">
                {filterEstado === 'pendientes'
                  ? 'No hay alertas pendientes con los filtros seleccionados.'
                  : 'No hay alertas con los filtros seleccionados.'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!atenderTarget} onOpenChange={(open) => !open && setAtenderTarget(null)}>
        <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="text-sm">Atender alerta</DialogTitle>
          </DialogHeader>
          {atenderTarget && (
            <p className="text-xs text-gray-600">
              {atenderTarget.titulo}
              <span className="block mt-1 text-gray-500">
                Al confirmar, la alerta se marca como atendida y deja de contar como pendiente. Quedará en el historial con la acción que describa.
              </span>
            </p>
          )}
          <textarea
            value={accionText}
            onChange={(e) => setAccionText(e.target.value)}
            className="w-full h-24 px-3 py-2 text-xs border border-gray-200 rounded-md resize-none"
            placeholder="Describa la acción tomada..."
          />
          {atenderError && <p className="text-xs text-red-600">{atenderError}</p>}
          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => setAtenderTarget(null)}
              className="px-3 py-2 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={atenderBusy}
              onClick={handleAtenderSubmit}
              className="px-3 py-2 text-xs rounded-md bg-brand-primary text-white hover:bg-brand-primary-light disabled:opacity-60"
            >
              {atenderBusy ? 'Guardando...' : 'Confirmar'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </PageState>
  );
}
