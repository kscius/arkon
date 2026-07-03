import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageState } from '@/components/PageState';
import { useAsyncData } from '@/hooks/use-async-data';
import { fetchProgramas } from '@/lib/api';
import { formatCurrencyM, formatPercentage, getProgramaColor, getProgramaName } from '@/lib/utils';
import { getBrand } from '@/config/brand';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layers, Building2, Activity, AlertTriangle, DollarSign } from 'lucide-react';

export default function ProgramasPage() {
  const brand = getBrand();
  const { obraEntity } = brand;
  const navigate = useNavigate();

  const load = useCallback(async () => fetchProgramas(), []);
  const { data: programas, loading, error, reload } = useAsyncData(load, [load]);

  return (
    <PageState loading={loading} error={error} onRetry={reload}>
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6">
          <div className="flex items-center gap-3">
            <Layers className="w-6 h-6 text-brand-primary" />
            <div>
              <h1 className="text-lg font-bold text-brand-primary">Programas</h1>
              <p className="text-xs text-gray-500 mt-1">
                Vista consolidada de acciones e inversión por programa del sector hídrico
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(programas ?? []).map((programa) => (
            <Card
              key={programa.id}
              className="cursor-pointer hover:shadow-md transition-shadow border-gray-200"
              onClick={() => navigate(`/programas/${programa.id}`)}
              role="link"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/programas/${programa.id}`);
                }
              }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-semibold text-brand-primary leading-snug">
                    {programa.nombre}
                  </CardTitle>
                  <Badge
                    className="text-[10px] shrink-0"
                    style={{ backgroundColor: getProgramaColor(programa.id), color: 'white' }}
                  >
                    {getProgramaName(programa.id)}
                  </Badge>
                </div>
                {programa.descripcion && (
                  <p className="text-[11px] text-gray-500 line-clamp-2 mt-1">{programa.descripcion}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-md p-2">
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 uppercase">
                      <Activity className="w-3 h-3" />
                      Acciones
                    </div>
                    <div className="text-lg font-bold text-gray-900">{programa.accionesCount}</div>
                  </div>
                  <div className="bg-gray-50 rounded-md p-2">
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 uppercase">
                      <Building2 className="w-3 h-3" />
                      {obraEntity.pluralCap}
                    </div>
                    <div className="text-lg font-bold text-gray-900">{programa.obrasCount}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    Autorizado
                  </span>
                  <span className="font-semibold">{formatCurrencyM(programa.montoAutorizado)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Avance físico prom.</span>
                  <span className="font-semibold">{formatPercentage(programa.avanceFisicoPromedio)}</span>
                </div>
                {programa.accionesConRetraso > 0 && (
                  <div className="flex items-center gap-1 text-[11px] text-red-600">
                    <AlertTriangle className="w-3 h-3" />
                    {programa.accionesConRetraso} con retraso
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {programas?.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-12">No hay programas con acciones registradas.</p>
        )}
      </div>
    </PageState>
  );
}
