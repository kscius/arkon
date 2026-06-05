import { useParams, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PageState } from '@/components/PageState';
import { useApp } from '@/context/AppContext';
import { useAsyncData } from '@/hooks/use-async-data';
import { fetchMunicipio, fetchMunicipios, fetchObras } from '@/lib/api';
import { formatCurrencyM, formatPercentage, getObraStatusColor, getObraStatusLabel, getProgramaColor, getProgramaName } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Building2, TrendingUp, AlertTriangle, DollarSign, MapPin } from 'lucide-react';

export default function MunicipioPanelPage() {
  const { municipioId } = useParams<{ municipioId: string }>();
  const navigate = useNavigate();
  const { user } = useApp();
  const [selectedId, setSelectedId] = useState(municipioId ?? user?.municipioId ?? '');

  useEffect(() => {
    if (municipioId) setSelectedId(municipioId);
    else if (user?.municipioId) setSelectedId(user.municipioId);
  }, [municipioId, user?.municipioId]);

  const load = useCallback(async () => {
    const [municipios, obras] = await Promise.all([fetchMunicipios(), fetchObras()]);
    const id = selectedId || municipios[0]?.id;
    const municipio = id
      ? municipios.find((m) => m.id === id) ?? (await fetchMunicipio(id))
      : municipios[0];
    const municipioObras = municipio
      ? obras.filter((o) => o.municipioId === municipio.id)
      : [];
    return { municipios, municipio, municipioObras };
  }, [selectedId]);

  const { data, loading, error, reload } = useAsyncData(load, [load]);

  if (!data?.municipio) {
    return <PageState loading={loading} error={error} onRetry={reload}><span /></PageState>;
  }

  const { municipios, municipio, municipioObras } = data;
  const obrasRetrasadas = municipioObras.filter(
    (o) => o.estatus === 'en_ejecucion_retraso' || o.estatus === 'en_riesgo',
  );
  const avancePromedio =
    municipioObras.length > 0
      ? municipioObras.reduce((s, o) => s + o.avanceFisicoReal, 0) / municipioObras.length
      : 0;

  const canPickMunicipio = user?.role === 'estatal';

  return (
    <PageState loading={loading} error={error} onRetry={reload}>
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-lg font-bold text-brand-primary">Panel del Municipio</h1>
              {canPickMunicipio ? (
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger className="w-[200px] h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {municipios.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="text-xs">
                        {m.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline">{municipio.nombre}</Badge>
              )}
            </div>
            <p className="text-xs text-gray-500">Gestion de obras publicas municipales</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-brand-primary" />
              <span className="text-[10px] text-gray-500 uppercase">Obras</span>
            </div>
            <div className="text-xl font-bold text-gray-900">{municipio.obras}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-brand-accent" />
              <span className="text-[10px] text-gray-500 uppercase">Inversion</span>
            </div>
            <div className="text-xl font-bold text-gray-900">{formatCurrencyM(municipio.inversionTotal)}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-[#3182CE]" />
              <span className="text-[10px] text-gray-500 uppercase">Avance Fisico</span>
            </div>
            <div className="text-xl font-bold text-gray-900">{formatPercentage(avancePromedio)}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-[10px] text-gray-500 uppercase">Con Retraso</span>
            </div>
            <div className="text-xl font-bold text-red-600">{obrasRetrasadas.length}</div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Obras del Municipio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {municipioObras.map((obra) => (
              <motion.div
                key={obra.id}
                className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/obras/${obra.id}`)}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: getProgramaColor(obra.programa) + '20' }}>
                  <MapPin className="w-4 h-4" style={{ color: getProgramaColor(obra.programa) }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">{obra.nombre}</p>
                  <p className="text-[10px] text-gray-500">{obra.folio} — {getProgramaName(obra.programa)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={obra.avanceFisicoReal} className="h-1.5 flex-1" />
                    <span className="text-[10px] font-medium">{formatPercentage(obra.avanceFisicoReal)}</span>
                  </div>
                </div>
                <Badge style={{ backgroundColor: getObraStatusColor(obra.estatus) + '20', color: getObraStatusColor(obra.estatus) }} className="text-[10px]">
                  {getObraStatusLabel(obra.estatus)}
                </Badge>
              </motion.div>
            ))}
            {municipioObras.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">No hay obras registradas para este municipio.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    </PageState>
  );
}
