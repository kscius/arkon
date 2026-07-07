import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageState } from '@/components/PageState';
import { AccionFormModal } from '@/components/AccionFormModal';
import { useApp } from '@/context/AppContext';
import { useAsyncData } from '@/hooks/use-async-data';
import { downloadAccionesExport, fetchMunicipios, fetchAcciones } from '@/lib/api';
import {
  formatCurrencyM,
  formatPercentage,
  getAccionStatusColor,
  getAccionStatusLabel,
  getProgramaColor,
  getProgramaName,
} from '@/lib/utils';
import type { Accion } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TruncateTooltip } from '@/components/ui/truncate-tooltip';
import { AlertTriangle, ArrowRight, Download, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { getBrand } from '@/config/brand';

const ALL = '__all__';

/**
 * Estatus de una acción que exigen trabajo del administrador. La vista por
 * defecto de /acciones es una cola de trabajo: solo muestra acciones en estos
 * estados. El catálogo completo queda detrás de la pestaña "Todas".
 */
const ATENCION_ESTATUS: readonly string[] = [
  'en_ejecucion_retraso',
  'en_riesgo',
  'en_revision',
  'suspendida',
];

/** Motivo legible por el que una acción requiere atención (según su estatus). */
function motivoAtencion(estatus: string): string {
  switch (estatus) {
    case 'en_ejecucion_retraso':
      return 'Ejecución con retraso — requiere seguimiento';
    case 'en_riesgo':
      return 'En riesgo — requiere intervención';
    case 'en_revision':
      return 'En revisión — requiere resolución';
    case 'suspendida':
      return 'Suspendida — requiere decisión';
    default:
      return 'Requiere atención';
  }
}

function filterObrasForRole(obras: Accion[], role: string, municipioId?: string, contratistaId?: string) {
  if (role === 'municipal' && municipioId) {
    return obras.filter((o) => o.municipioId === municipioId);
  }
  if (role === 'contratista' && contratistaId) {
    return obras.filter((o) => o.contratistaId === contratistaId);
  }
  return obras;
}

type Vista = 'atencion' | 'todas';

export default function AccionesPage() {
  const { entity } = getBrand();
  const navigate = useNavigate();
  const { user } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [obraModalOpen, setObraModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filtros y vista viven en la URL para soportar deep-links desde el dashboard
  // (p. ej. /acciones?estatus=en_riesgo) y preservar el estado al navegar.
  const estatusParam = searchParams.get('estatus') ?? ALL;
  const programaFilter = searchParams.get('programa') ?? ALL;
  const municipioFilter = searchParams.get('municipio') ?? ALL;
  const search = searchParams.get('q') ?? '';
  // Si llega un estatus específico por deep-link, mostramos el catálogo filtrado
  // (no la cola de atención), salvo que la vista se fije explícitamente.
  const vista: Vista =
    (searchParams.get('vista') as Vista | null) ?? (estatusParam !== ALL ? 'todas' : 'atencion');

  const setParam = useCallback(
    (key: string, value: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (!value || value === ALL) next.delete(key);
          else next.set(key, value);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setVista = useCallback(
    (v: Vista) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('vista', v);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const load = useCallback(async () => {
    const [obras, municipios] = await Promise.all([fetchAcciones(), fetchMunicipios()]);
    return { obras, municipios };
  }, []);

  const { data, loading, error, reload } = useAsyncData(load, [load]);

  const scopedObras = useMemo(() => {
    if (!data?.obras || !user) return [];
    return filterObrasForRole(data.obras, user.role, user.municipioId, user.contratistaId);
  }, [data?.obras, user]);

  const atencionObras = useMemo(
    () => scopedObras.filter((o) => ATENCION_ESTATUS.includes(o.estatus)),
    [scopedObras],
  );

  const baseList = vista === 'atencion' ? atencionObras : scopedObras;

  const programaOptions = useMemo(() => {
    const ids = [...new Set(scopedObras.map((o) => o.programa).filter(Boolean))];
    return ids.map((id) => ({ id, label: getProgramaName(id) }));
  }, [scopedObras]);

  const estatusOptions = useMemo(() => {
    const ids = [...new Set(scopedObras.map((o) => o.estatus))];
    return ids.map((id) => ({ id, label: getAccionStatusLabel(id) }));
  }, [scopedObras]);

  const filteredObras = useMemo(() => {
    const q = search.trim().toLowerCase();
    return baseList.filter((obra) => {
      if (programaFilter !== ALL && obra.programa !== programaFilter) return false;
      if (estatusParam !== ALL && obra.estatus !== estatusParam) return false;
      if (municipioFilter !== ALL && obra.municipioId !== municipioFilter) return false;
      if (!q) return true;
      return (
        obra.nombre.toLowerCase().includes(q) ||
        obra.folio.toLowerCase().includes(q) ||
        (obra.cua?.toLowerCase().includes(q) ?? false) ||
        obra.municipio.toLowerCase().includes(q) ||
        obra.contratista.toLowerCase().includes(q)
      );
    });
  }, [baseList, search, programaFilter, estatusParam, municipioFilter]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadAccionesExport('csv');
      toast.success('Exportación descargada');
    } catch {
      toast.error('No se pudo exportar el catálogo');
    } finally {
      setExporting(false);
    }
  };

  if (!data || !user) {
    return (
      <PageState loading={loading} error={error} onRetry={reload}>
        <span />
      </PageState>
    );
  }

  const canCreate = user.role === 'estatal';
  const canExport = user.role === 'estatal';
  const showMunicipioFilter = user.role === 'estatal';
  const enAtencion = vista === 'atencion';
  const pageTitle =
    user.role === 'contratista'
      ? `Mis ${entity.pluralCap}`
      : `Centro de trabajo — ${entity.pluralCap}`;

  return (
    <PageState loading={loading} error={error} onRetry={reload}>
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold text-brand-primary">{pageTitle}</h1>
              <p className="text-xs text-gray-500 mt-1">
                {enAtencion
                  ? `${atencionObras.length} ${entity.plural} requieren tu atención`
                  : `${filteredObras.length} de ${scopedObras.length} ${entity.plural} en tu alcance`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canExport && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  disabled={exporting}
                  className="text-xs"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Exportar CSV
                </Button>
              )}
              {canCreate && (
                <Button size="sm" onClick={() => setObraModalOpen(true)} className="text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  {`Nueva ${entity.singular}`}
                </Button>
              )}
            </div>
          </div>

          {/* Selector de vista: cola de trabajo (atención) vs catálogo completo. */}
          <div
            className="inline-flex mt-4 rounded-lg border border-gray-200 p-0.5 bg-gray-50"
            role="tablist"
            aria-label="Modo de vista"
          >
            <button
              type="button"
              role="tab"
              aria-selected={enAtencion}
              onClick={() => setVista('atencion')}
              className={`cursor-pointer px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                enAtencion
                  ? 'bg-white text-brand-primary shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Requieren atención ({atencionObras.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!enAtencion}
              onClick={() => setVista('todas')}
              className={`cursor-pointer px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                !enAtencion
                  ? 'bg-white text-brand-primary shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Todas ({scopedObras.length})
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <button
              type="button"
              onClick={() => {
                setVista('atencion');
                setParam('estatus', ALL);
              }}
              className="cursor-pointer text-left bg-amber-50 rounded-lg p-3 border border-amber-100 hover:border-amber-300 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-[10px] text-amber-700 uppercase">Requieren atención</span>
              </div>
              <div className="text-xl font-bold text-amber-700">{atencionObras.length}</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setVista('todas');
                setParam('estatus', 'en_ejecucion_retraso');
              }}
              className="cursor-pointer text-left bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors"
            >
              <span className="text-[10px] text-gray-500 uppercase">Con retraso</span>
              <div className="text-xl font-bold text-red-600 mt-1">
                {scopedObras.filter((o) => o.estatus === 'en_ejecucion_retraso').length}
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                setVista('todas');
                setParam('estatus', 'en_riesgo');
              }}
              className="cursor-pointer text-left bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors"
            >
              <span className="text-[10px] text-gray-500 uppercase">En riesgo</span>
              <div className="text-xl font-bold text-red-600 mt-1">
                {scopedObras.filter((o) => o.estatus === 'en_riesgo').length}
              </div>
            </button>
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-[10px] text-gray-500 uppercase">Inversión (alcance)</span>
              <div className="text-xl font-bold text-gray-900 mt-1">
                {formatCurrencyM(scopedObras.reduce((s, o) => s + o.montoAutorizado, 0))}
              </div>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Buscar y filtrar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <label htmlFor="obras-search" className="sr-only">
                Buscar {entity.plural}
              </label>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden />
              <Input
                id="obras-search"
                value={search}
                onChange={(e) => setParam('q', e.target.value)}
                placeholder="Buscar por nombre, folio, CUA, municipio o contratista…"
                className="pl-9 text-xs h-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={programaFilter} onValueChange={(v) => setParam('programa', v)}>
                <SelectTrigger className="w-[180px] h-9 text-xs">
                  <SelectValue placeholder="Programa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL} className="text-xs">
                    Todos los programas
                  </SelectItem>
                  {programaOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={estatusParam} onValueChange={(v) => setParam('estatus', v)}>
                <SelectTrigger className="w-[180px] h-9 text-xs">
                  <SelectValue placeholder="Estatus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL} className="text-xs">
                    Todos los estatus
                  </SelectItem>
                  {estatusOptions.map((e) => (
                    <SelectItem key={e.id} value={e.id} className="text-xs">
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showMunicipioFilter && (
                <Select value={municipioFilter} onValueChange={(v) => setParam('municipio', v)}>
                  <SelectTrigger className="w-[180px] h-9 text-xs">
                    <SelectValue placeholder="Municipio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL} className="text-xs">
                      Todos los municipios
                    </SelectItem>
                    {data.municipios.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="text-xs">
                        {m.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              {enAtencion ? `${entity.pluralCap} por atender` : `Listado de ${entity.plural}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-500">Folio</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500">{entity.singularCap}</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500">Municipio</th>
                    {enAtencion ? (
                      <th className="text-left py-2 px-2 font-medium text-gray-500">Motivo</th>
                    ) : (
                      <th className="text-left py-2 px-2 font-medium text-gray-500">Contratista</th>
                    )}
                    <th className="text-left py-2 px-2 font-medium text-gray-500">Programa</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500">Avance</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500">Estatus</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-500">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredObras.map((obra) => (
                    <tr
                      key={obra.id}
                      role="link"
                      tabIndex={0}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:ring-inset"
                      onClick={() => navigate(`/acciones/${obra.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/acciones/${obra.id}`);
                        }
                      }}
                    >
                      <td className="py-2 px-2 text-gray-600 whitespace-nowrap">{obra.folio}</td>
                      <td className="py-2 px-2 font-medium text-gray-900">
                        <TruncateTooltip text={obra.nombre} maxWidthClass="max-w-[220px]" />
                      </td>
                      <td className="py-2 px-2 text-gray-600">
                        <TruncateTooltip text={obra.municipio} maxWidthClass="max-w-[120px]" />
                      </td>
                      {enAtencion ? (
                        <td className="py-2 px-2 text-amber-700">
                          <TruncateTooltip
                            text={motivoAtencion(obra.estatus)}
                            maxWidthClass="max-w-[220px]"
                          />
                        </td>
                      ) : (
                        <td className="py-2 px-2 text-gray-600">
                          <TruncateTooltip text={obra.contratista} maxWidthClass="max-w-[140px]" />
                        </td>
                      )}
                      <td className="py-2 px-2">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                          style={{ backgroundColor: getProgramaColor(obra.programa) }}
                        >
                          {getProgramaName(obra.programa)}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center text-[10px]">
                        {formatPercentage(obra.avanceFisicoReal)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                          style={{ backgroundColor: getAccionStatusColor(obra.estatus) }}
                        >
                          {getAccionStatusLabel(obra.estatus)}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[11px] px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/acciones/${obra.id}`);
                          }}
                        >
                          Gestionar
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredObras.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-10">
                  {enAtencion
                    ? `No hay ${entity.plural} que requieran atención con los filtros seleccionados.`
                    : `No hay ${entity.plural} que coincidan con los filtros seleccionados.`}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {canCreate && (
        <AccionFormModal
          open={obraModalOpen}
          onOpenChange={setObraModalOpen}
          user={user}
          onSuccess={reload}
        />
      )}
    </PageState>
  );
}
