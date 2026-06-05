import { useParams, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RankingContratistasChart } from '@/components/dashboard/RankingContratistasChart';
import { PageState } from '@/components/PageState';
import { useApp } from '@/context/AppContext';
import { useAsyncData } from '@/hooks/use-async-data';
import { fetchChartTopContratistas, fetchContratista, fetchContratistas, fetchObras } from '@/lib/api';
import { formatCurrencyM, formatPercentage, getObraStatusColor, getObraStatusLabel, getProgramaName } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';

export default function ContratistaPanelPage() {
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

  const load = useCallback(async () => {
    const [contratistas, obras, topContratistas] = await Promise.all([
      fetchContratistas(),
      fetchObras(),
      showRanking
        ? fetchChartTopContratistas(
            programaFilter === '__all__' ? undefined : programaFilter,
          ).catch(() => [])
        : Promise.resolve([]),
    ]);
    const id = selectedId || contratistas[0]?.id;
    const contratista = id
      ? contratistas.find((c) => c.id === id) ?? (await fetchContratista(id))
      : contratistas[0];
    const contratistaObras = contratista
      ? obras.filter((o) => o.contratistaId === contratista.id)
      : [];
    return { contratistas, contratista, contratistaObras, obras, topContratistas };
  }, [selectedId, showRanking, programaFilter]);

  const { data, loading, error, reload } = useAsyncData(load, [load]);

  const obras = data?.obras ?? [];
  const programaOptions = useMemo(() => {
    const ids = [...new Set(obras.map((o) => o.programa).filter(Boolean))];
    return ids.map((id) => ({ id, label: getProgramaName(id) }));
  }, [obras]);

  if (!data?.contratista) {
    return <PageState loading={loading} error={error} onRetry={reload}><span /></PageState>;
  }

  const { contratistas, contratista, contratistaObras, topContratistas } = data;
  const canPickContratista = user?.role === 'estatal' || user?.role === 'municipal';

  return (
    <PageState loading={loading} error={error} onRetry={reload}>
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-lg font-bold text-brand-primary">Panel del Contratista</h1>
              {canPickContratista ? (
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger className="w-[250px] h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contratistas.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-xs text-gray-600">{contratista.nombre}</span>
              )}
            </div>
            <p className="text-[11px] text-gray-500">RFC: {contratista.rfc}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <Building2 className="w-4 h-4 text-brand-primary mb-1" />
            <div className="text-xl font-bold">{contratista.obrasAsignadas}</div>
            <div className="text-[10px] text-gray-500">Obras asignadas</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <DollarSign className="w-4 h-4 text-brand-accent mb-1" />
            <div className="text-xl font-bold">{formatCurrencyM(contratista.montoTotal)}</div>
            <div className="text-[10px] text-gray-500">Monto total</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <TrendingUp className="w-4 h-4 text-[#3182CE] mb-1" />
            <div className="text-xl font-bold">{formatPercentage(contratista.avancePromedio)}</div>
            <div className="text-[10px] text-gray-500">Avance promedio</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 text-red-500 mb-1" />
            <div className="text-xl font-bold">{contratista.observacionesPendientes}</div>
            <div className="text-[10px] text-gray-500">Observaciones</div>
          </div>
        </div>
      </div>

      {showRanking && (
        <RankingContratistasChart
          rows={topContratistas}
          programas={programaOptions}
          programaFilter={programaFilter}
          onProgramaFilterChange={setProgramaFilter}
        />
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Obras asignadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {contratistaObras.map((obra) => (
              <div
                key={obra.id}
                className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/obras/${obra.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{obra.nombre}</p>
                  <p className="text-[10px] text-gray-500">{obra.folio} — {getProgramaName(obra.programa)}</p>
                </div>
                <span className="text-[10px] font-medium" style={{ color: getObraStatusColor(obra.estatus) }}>
                  {getObraStatusLabel(obra.estatus)}
                </span>
              </div>
            ))}
            {contratistaObras.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-6">Sin obras asignadas.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    </PageState>
  );
}
