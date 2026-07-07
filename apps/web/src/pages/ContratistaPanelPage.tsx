import { useParams, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RankingContratistasChart } from '@/components/dashboard/RankingContratistasChart';
import { PageState } from '@/components/PageState';
import { useApp } from '@/context/AppContext';
import { useAsyncData } from '@/hooks/use-async-data';
import { fetchChartTopContratistas, fetchContratista, fetchContratistas, fetchAcciones } from '@/lib/api';
import { formatCurrencyM, formatPercentage, getAccionStatusColor, getAccionStatusLabel, getProgramaName } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComboBox } from '@/components/ui/combobox';
import { Building2, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import { getBrand } from '@/config/brand';

export default function ContratistaPanelPage() {
  const { entity } = getBrand();
  const { contratistaId } = useParams<{ contratistaId: string }>();
  const navigate = useNavigate();
  const { user } = useApp();
  const [selectedId, setSelectedId] = useState(contratistaId ?? user?.contratistaId ?? '');
  const [programaFilter, setProgramaFilter] = useState('__all__');
  const showRanking = user?.role === 'estatal' || user?.role === 'municipal';

  useEffect(() => {
    if (contratistaId) setSelectedId(contratistaId);
    else if (user?.contratistaId) setSelectedId(user.contratistaId);
  }, [contratistaId, user?.contratistaId]);

  const loadBase = useCallback(async () => {
    const [contratistas, obras] = await Promise.all([fetchContratistas(), fetchAcciones()]);
    const id = selectedId || contratistas[0]?.id;
    const contratista = id
      ? contratistas.find((c) => c.id === id) ?? (await fetchContratista(id))
      : contratistas[0];
    const contratistaObras = contratista
      ? obras.filter((o) => o.contratistaId === contratista.id)
      : [];
    return { contratistas, contratista, contratistaObras, obras };
  }, [selectedId]);

  const { data: baseData, loading: baseLoading, error: baseError, reload: reloadBase } =
    useAsyncData(loadBase, [loadBase]);

  const loadRanking = useCallback(async () => {
    if (!showRanking) return [];
    return fetchChartTopContratistas(
      programaFilter === '__all__' ? undefined : programaFilter,
    ).catch(() => []);
  }, [showRanking, programaFilter]);

  const { data: topContratistas = [], loading: rankingLoading } = useAsyncData(
    loadRanking,
    [loadRanking],
  );

  const loading = baseLoading || (showRanking && rankingLoading);
  const error = baseError;
  const reload = reloadBase;

  const contratista = baseData?.contratista;
  const contratistas = useMemo(() => baseData?.contratistas ?? [], [baseData?.contratistas]);
  const contratistaObrasAll = useMemo(
    () => baseData?.contratistaObras ?? [],
    [baseData?.contratistaObras],
  );

  const programaOptions = useMemo(() => {
    const ids = [...new Set(contratistaObrasAll.map((o) => o.programa).filter(Boolean))];
    return ids.map((id) => ({ id, label: getProgramaName(id) }));
  }, [contratistaObrasAll]);

  useEffect(() => {
    if (
      programaFilter !== '__all__' &&
      programaOptions.length > 0 &&
      !programaOptions.some((p) => p.id === programaFilter)
    ) {
      setProgramaFilter('__all__');
    }
  }, [programaFilter, programaOptions]);

  const contratistaObras = useMemo(() => {
    if (programaFilter === '__all__') return contratistaObrasAll;
    return contratistaObrasAll.filter((o) => o.programa === programaFilter);
  }, [contratistaObrasAll, programaFilter]);

  const displayStats = useMemo(() => {
    if (!contratista) return null;
    if (programaFilter === '__all__' || contratistaObras.length === 0) {
      return {
        obrasAsignadas: contratista.obrasAsignadas,
        montoTotal: contratista.montoTotal,
        avancePromedio: contratista.avancePromedio,
        observacionesPendientes: contratista.observacionesPendientes,
      };
    }
    const montoTotal = contratistaObras.reduce((s, o) => s + (o.montoContratado ?? 0), 0);
    const avancePromedio =
      contratistaObras.reduce((s, o) => s + o.avanceFisicoReal, 0) / contratistaObras.length;
    return {
      obrasAsignadas: contratistaObras.length,
      montoTotal,
      avancePromedio,
      observacionesPendientes: contratista.observacionesPendientes,
    };
  }, [contratista, contratistaObras, programaFilter]);

  const contratistaOptions = useMemo(
    () => contratistas.map((c) => ({ value: c.id, label: c.nombre })),
    [contratistas],
  );

  const canPickContratista = user?.role === 'estatal' || user?.role === 'municipal';

  const handleContratistaChange = (id: string) => {
    setSelectedId(id);
    if (canPickContratista) navigate(`/contratistas/${id}`);
  };

  if (!contratista || !displayStats) {
    return <PageState loading={loading} error={error} onRetry={reload}><span /></PageState>;
  }
  const programaLabel =
    programaFilter === '__all__'
      ? 'todos los programas'
      : getProgramaName(programaFilter);

  return (
    <PageState loading={loading} error={error} onRetry={reload}>
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
              <h1 className="text-lg font-bold text-brand-primary shrink-0">Panel del Contratista</h1>
              {canPickContratista ? (
                <ComboBox
                  options={contratistaOptions}
                  value={selectedId}
                  onValueChange={handleContratistaChange}
                  placeholder="Selecciona un contratista..."
                  searchPlaceholder="Buscar contratista..."
                  triggerClassName="sm:max-w-md lg:max-w-lg"
                  className="w-full sm:w-auto sm:min-w-[280px] sm:max-w-lg"
                />
              ) : (
                <span className="text-xs text-gray-600 truncate" title={contratista.nombre}>
                  {contratista.nombre}
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-500">RFC: {contratista.rfc}</p>
            {showRanking && programaFilter !== '__all__' && (
              <p className="text-[10px] text-gray-400 mt-1">
                Indicadores filtrados por programa: {programaLabel}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <Building2 className="w-4 h-4 text-brand-primary mb-1" />
            <div className="text-xl font-bold">{displayStats.obrasAsignadas}</div>
            <div className="text-[10px] text-gray-500">{entity.pluralCap} asignadas</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <DollarSign className="w-4 h-4 text-brand-accent mb-1" />
            <div className="text-xl font-bold">{formatCurrencyM(displayStats.montoTotal)}</div>
            <div className="text-[10px] text-gray-500">Monto total</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <TrendingUp className="w-4 h-4 text-[#3182CE] mb-1" />
            <div className="text-xl font-bold">{formatPercentage(displayStats.avancePromedio)}</div>
            <div className="text-[10px] text-gray-500">Avance promedio</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 text-red-500 mb-1" />
            <div className="text-xl font-bold">{displayStats.observacionesPendientes}</div>
            <div className="text-[10px] text-gray-500">Observaciones</div>
          </div>
        </div>
      </div>

      {showRanking && (
        <RankingContratistasChart
          rows={topContratistas ?? []}
          programas={programaOptions}
          programaFilter={programaFilter}
          onProgramaFilterChange={setProgramaFilter}
          highlightContratistaId={selectedId}
          contextLabel={contratista.nombre}
        />
      )}

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <CardTitle className="text-sm font-semibold">{entity.pluralCap} asignadas</CardTitle>
            {programaFilter !== '__all__' && (
              <span className="text-[10px] text-gray-500">
                Filtradas por {programaLabel}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {contratistaObras.map((obra) => (
              <div
                key={obra.id}
                className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/acciones/${obra.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{obra.nombre}</p>
                  <p className="text-[10px] text-gray-500">{obra.folio} — {getProgramaName(obra.programa)}</p>
                </div>
                <span className="text-[10px] font-medium shrink-0" style={{ color: getAccionStatusColor(obra.estatus) }}>
                  {getAccionStatusLabel(obra.estatus)}
                </span>
              </div>
            ))}
            {contratistaObras.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-6">
                {programaFilter === '__all__'
                  ? `Sin ${entity.plural} asignadas.`
                  : `Sin ${entity.plural} en ${programaLabel}.`}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    </PageState>
  );
}
