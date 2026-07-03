import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageState } from '@/components/PageState';
import { useApp } from '@/context/AppContext';
import { useAsyncData } from '@/hooks/use-async-data';
import { fetchMunicipios, fetchObrasFisicas } from '@/lib/api';
import { formatCurrencyM, formatPercentage, getProgramaColor, getProgramaName } from '@/lib/utils';
import { getBrand } from '@/config/brand';
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
import { Building2, Search } from 'lucide-react';
import type { ObraFisica } from '@/types';

const ALL = '__all__';

function filterObrasForRole(
  obras: ObraFisica[],
  role: string,
  municipioId?: string,
) {
  if (role === 'municipal' && municipioId) {
    return obras.filter((o) => o.municipioId === municipioId);
  }
  return obras;
}

export default function ObrasFisicasPage() {
  const { obraEntity } = getBrand();
  const navigate = useNavigate();
  const { user } = useApp();
  const [search, setSearch] = useState('');
  const [municipioFilter, setMunicipioFilter] = useState(ALL);
  const [estatusFilter, setEstatusFilter] = useState(ALL);

  const load = useCallback(async () => {
    const [obras, municipios] = await Promise.all([fetchObrasFisicas(), fetchMunicipios()]);
    return { obras, municipios };
  }, []);

  const { data, loading, error, reload } = useAsyncData(load, [load]);

  const scopedObras = useMemo(() => {
    if (!data?.obras || !user) return [];
    return filterObrasForRole(data.obras, user.role, user.municipioId);
  }, [data?.obras, user]);

  const estatusOptions = useMemo(() => {
    const ids = [...new Set(scopedObras.map((o) => o.estatusFisico).filter(Boolean))];
    return ids.map((id) => ({ id, label: id.replace(/_/g, ' ') }));
  }, [scopedObras]);

  const filteredObras = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scopedObras.filter((obra) => {
      if (municipioFilter !== ALL && obra.municipioId !== municipioFilter) return false;
      if (estatusFilter !== ALL && obra.estatusFisico !== estatusFilter) return false;
      if (!q) return true;
      return (
        obra.nombre.toLowerCase().includes(q) ||
        obra.clave.toLowerCase().includes(q) ||
        obra.localidad.toLowerCase().includes(q) ||
        obra.municipio.toLowerCase().includes(q)
      );
    });
  }, [scopedObras, search, municipioFilter, estatusFilter]);

  if (!data || !user) {
    return (
      <PageState loading={loading} error={error} onRetry={reload}>
        <span />
      </PageState>
    );
  }

  const pageTitle =
    user.role === 'contratista'
      ? `Mis ${obraEntity.pluralCap}`
      : `Catálogo de ${obraEntity.pluralCap}`;
  const showMunicipioFilter = user.role === 'estatal';

  return (
    <PageState loading={loading} error={error} onRetry={reload}>
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold text-brand-primary">{pageTitle}</h1>
              <p className="text-xs text-gray-500 mt-1">
                {filteredObras.length} de {scopedObras.length} {obraEntity.plural} físicas en tu alcance
              </p>
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
              <span className="text-[10px] text-gray-500 uppercase">Acciones vinculadas</span>
              <div className="text-xl font-bold text-gray-900 mt-1">
                {scopedObras.reduce((s, o) => s + o.accionesCount, 0)}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-[10px] text-gray-500 uppercase">Inversión total</span>
              <div className="text-xl font-bold text-gray-900 mt-1">
                {formatCurrencyM(scopedObras.reduce((s, o) => s + o.montoAutorizadoTotal, 0))}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-[10px] text-gray-500 uppercase">Avance prom.</span>
              <div className="text-xl font-bold text-gray-900 mt-1">
                {scopedObras.length > 0
                  ? formatPercentage(
                      scopedObras.reduce((s, o) => s + o.avanceFisicoPromedio, 0) / scopedObras.length,
                    )
                  : '0%'}
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Buscar por nombre, clave, localidad o municipio…`}
                className="pl-9 text-xs h-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {estatusOptions.length > 0 && (
                <Select value={estatusFilter} onValueChange={setEstatusFilter}>
                  <SelectTrigger className="w-[180px] h-9 text-xs">
                    <SelectValue placeholder="Estatus físico" />
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
              )}
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
            <CardTitle className="text-sm font-semibold">{`Listado de ${obraEntity.plural}`}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-500">Clave</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500">{obraEntity.singularCap}</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500">Municipio</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500">Tipo</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500">Programas</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500">Acciones</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500">Avance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredObras.map((obra) => (
                    <tr
                      key={obra.id}
                      role="link"
                      tabIndex={0}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/obras/${obra.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/obras/${obra.id}`);
                        }
                      }}
                    >
                      <td className="py-2 px-2 text-gray-600 whitespace-nowrap">{obra.clave}</td>
                      <td className="py-2 px-2 font-medium text-gray-900">
                        <TruncateTooltip text={obra.nombre} maxWidthClass="max-w-[220px]" />
                      </td>
                      <td className="py-2 px-2 text-gray-600">
                        <TruncateTooltip text={obra.municipio} maxWidthClass="max-w-[120px]" />
                      </td>
                      <td className="py-2 px-2 text-gray-600">{obra.tipoObra}</td>
                      <td className="py-2 px-2">
                        <div className="flex flex-wrap gap-1">
                          {obra.programas.slice(0, 2).map((p) => (
                            <span
                              key={p}
                              className="px-1.5 py-0.5 rounded-full text-[9px] font-medium text-white"
                              style={{ backgroundColor: getProgramaColor(p) }}
                            >
                              {getProgramaName(p)}
                            </span>
                          ))}
                          {obra.programas.length > 2 && (
                            <span className="text-[9px] text-gray-400">+{obra.programas.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-center">{obra.accionesCount}</td>
                      <td className="py-2 px-2 text-center">{formatPercentage(obra.avanceFisicoPromedio)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredObras.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-10">
                  {`No hay ${obraEntity.plural} que coincidan con los filtros seleccionados.`}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageState>
  );
}
