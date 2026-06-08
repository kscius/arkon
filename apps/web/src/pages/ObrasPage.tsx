import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageState } from '@/components/PageState';
import { ObraFormModal } from '@/components/ObraFormModal';
import { useApp } from '@/context/AppContext';
import { useAsyncData } from '@/hooks/use-async-data';
import { downloadObrasExport, fetchMunicipios, fetchObras } from '@/lib/api';
import {
  formatCurrencyM,
  formatPercentage,
  getObraStatusColor,
  getObraStatusLabel,
  getProgramaColor,
  getProgramaName,
} from '@/lib/utils';
import type { Obra } from '@/types';
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
import { Building2, Download, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

const ALL = '__all__';

function filterObrasForRole(obras: Obra[], role: string, municipioId?: string, contratistaId?: string) {
  if (role === 'municipal' && municipioId) {
    return obras.filter((o) => o.municipioId === municipioId);
  }
  if (role === 'contratista' && contratistaId) {
    return obras.filter((o) => o.contratistaId === contratistaId);
  }
  return obras;
}

export default function ObrasPage() {
  const navigate = useNavigate();
  const { user } = useApp();
  const [search, setSearch] = useState('');
  const [programaFilter, setProgramaFilter] = useState(ALL);
  const [estatusFilter, setEstatusFilter] = useState(ALL);
  const [municipioFilter, setMunicipioFilter] = useState(ALL);
  const [obraModalOpen, setObraModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    const [obras, municipios] = await Promise.all([fetchObras(), fetchMunicipios()]);
    return { obras, municipios };
  }, []);

  const { data, loading, error, reload } = useAsyncData(load, [load]);

  const scopedObras = useMemo(() => {
    if (!data?.obras || !user) return [];
    return filterObrasForRole(data.obras, user.role, user.municipioId, user.contratistaId);
  }, [data?.obras, user]);

  const programaOptions = useMemo(() => {
    const ids = [...new Set(scopedObras.map((o) => o.programa).filter(Boolean))];
    return ids.map((id) => ({ id, label: getProgramaName(id) }));
  }, [scopedObras]);

  const estatusOptions = useMemo(() => {
    const ids = [...new Set(scopedObras.map((o) => o.estatus))];
    return ids.map((id) => ({ id, label: getObraStatusLabel(id) }));
  }, [scopedObras]);

  const filteredObras = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scopedObras.filter((obra) => {
      if (programaFilter !== ALL && obra.programa !== programaFilter) return false;
      if (estatusFilter !== ALL && obra.estatus !== estatusFilter) return false;
      if (municipioFilter !== ALL && obra.municipioId !== municipioFilter) return false;
      if (!q) return true;
      return (
        obra.nombre.toLowerCase().includes(q) ||
        obra.folio.toLowerCase().includes(q) ||
        obra.municipio.toLowerCase().includes(q) ||
        obra.contratista.toLowerCase().includes(q)
      );
    });
  }, [scopedObras, search, programaFilter, estatusFilter, municipioFilter]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadObrasExport('csv');
      toast.success('Exportacion descargada');
    } catch {
      toast.error('No se pudo exportar el catalogo');
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
  const pageTitle =
    user.role === 'contratista' ? 'Mis obras' : 'Catalogo de obras';

  return (
    <PageState loading={loading} error={error} onRetry={reload}>
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold text-brand-primary">{pageTitle}</h1>
              <p className="text-xs text-gray-500 mt-1">
                {filteredObras.length} de {scopedObras.length} obras en tu alcance
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
                  Nueva obra
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-4 h-4 text-brand-primary" />
                <span className="text-[10px] text-gray-500 uppercase">Total</span>
              </div>
              <div className="text-xl font-bold text-gray-900">{scopedObras.length}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-[10px] text-gray-500 uppercase">En ejecucion</span>
              <div className="text-xl font-bold text-gray-900 mt-1">
                {
                  scopedObras.filter(
                    (o) =>
                      o.estatus === 'en_ejecucion_a_tiempo' ||
                      o.estatus === 'en_ejecucion_retraso',
                  ).length
                }
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-[10px] text-gray-500 uppercase">Con retraso / riesgo</span>
              <div className="text-xl font-bold text-red-600 mt-1">
                {
                  scopedObras.filter(
                    (o) => o.estatus === 'en_ejecucion_retraso' || o.estatus === 'en_riesgo',
                  ).length
                }
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-[10px] text-gray-500 uppercase">Inversion</span>
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, folio, municipio o contratista..."
                className="pl-9 text-xs h-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={programaFilter} onValueChange={setProgramaFilter}>
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
              <Select value={estatusFilter} onValueChange={setEstatusFilter}>
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
                <Select value={municipioFilter} onValueChange={setMunicipioFilter}>
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
            <CardTitle className="text-sm font-semibold">Listado de obras</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-500">Folio</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500">Obra</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500">Municipio</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500">Contratista</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500">Programa</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500">Avance</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500">Estatus</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredObras.map((obra) => (
                    <tr
                      key={obra.id}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/obras/${obra.id}`)}
                    >
                      <td className="py-2 px-2 text-gray-600 whitespace-nowrap">{obra.folio}</td>
                      <td className="py-2 px-2 font-medium text-gray-900 max-w-[220px] truncate">
                        {obra.nombre}
                      </td>
                      <td className="py-2 px-2 text-gray-600 max-w-[120px] truncate">
                        {obra.municipio}
                      </td>
                      <td className="py-2 px-2 text-gray-600 max-w-[140px] truncate">
                        {obra.contratista}
                      </td>
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
                          style={{ backgroundColor: getObraStatusColor(obra.estatus) }}
                        >
                          {getObraStatusLabel(obra.estatus)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredObras.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-10">
                  No hay obras que coincidan con los filtros seleccionados.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {canCreate && (
        <ObraFormModal
          open={obraModalOpen}
          onOpenChange={setObraModalOpen}
          user={user}
          onSuccess={reload}
        />
      )}
    </PageState>
  );
}
