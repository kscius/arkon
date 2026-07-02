import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Calendar, Sparkles } from 'lucide-react';
import type { AttentionToday } from '@/lib/api';
import { formatPercentage } from '@/lib/utils';

interface AttentionTodayPanelProps {
  data: AttentionToday;
}

const riskColor = (nivel: string) =>
  nivel === 'rojo' ? 'bg-red-100 text-red-800' : nivel === 'ambar' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800';

export function AttentionTodayPanel({ data }: AttentionTodayPanelProps) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          Qué requiere atención hoy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase mb-2">Top riesgos calculados</p>
          <div className="space-y-2">
            {data.top_riesgos.slice(0, 5).map((r) => (
              <button
                key={r.accion_id}
                type="button"
                onClick={() => navigate(`/obras/${r.accion_id}`)}
                className="w-full flex items-center justify-between p-2 rounded-lg border border-gray-100 hover:bg-gray-50 text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.folio}</p>
                  <p className="text-xs text-gray-500 truncate">{r.municipio}</p>
                </div>
                <Badge className={riskColor(r.riesgo_nivel)}>{Math.round(r.riesgo_score)}</Badge>
              </button>
            ))}
            {data.top_riesgos.length === 0 && (
              <p className="text-sm text-gray-500">Sin scores de riesgo. Ejecute recomputo de métricas.</p>
            )}
          </div>
        </div>

        {data.plazos_criticos.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-2 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Plazos PROAGUA críticos
            </p>
            <ul className="space-y-1 text-sm">
              {data.plazos_criticos.slice(0, 4).map((p) => (
                <li key={p.codigo} className="flex justify-between gap-2">
                  <span className="truncate">{p.descripcion}</span>
                  <span className={p.dias_restantes < 0 ? 'text-red-600' : 'text-amber-600'}>
                    {p.dias_restantes}d
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.recomendaciones.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Recomendaciones pendientes ({data.recomendaciones_pendientes})
            </p>
            {data.recomendaciones.slice(0, 3).map((rec, i) => (
              <p key={`${rec.titulo}-${i}`} className="text-sm text-gray-700 border-l-2 border-brand-primary pl-2 mb-1">
                {rec.titulo}
              </p>
            ))}
          </div>
        )}

        {data.anomalias.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">Anomalías detectadas</p>
            {data.anomalias.slice(0, 3).map((a) => (
              <button
                key={a.accion_id}
                type="button"
                onClick={() => navigate(`/obras/${a.accion_id}`)}
                className="block w-full text-left text-sm text-gray-700 hover:underline"
              >
                {a.folio}: score {formatPercentage(a.anomalia_score)}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
