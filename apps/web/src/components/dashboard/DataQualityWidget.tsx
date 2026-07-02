import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DataQualityMetrics } from '@/lib/api';
import { Database } from 'lucide-react';

interface DataQualityWidgetProps {
  data: DataQualityMetrics;
}

const bars = [
  { key: 'pct_geo', label: 'Georreferencia' },
  { key: 'pct_contratista', label: 'Contratista' },
  { key: 'pct_avances', label: 'Avances' },
  { key: 'pct_documentos', label: 'Documentos' },
  { key: 'pct_cua', label: 'CUA' },
] as const;

export function DataQualityWidget({ data }: DataQualityWidgetProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Database className="w-4 h-4" />
          Calidad de datos
          <span className="ml-auto text-sm font-bold text-brand-primary">{Math.round(data.score_global)}%</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {bars.map(({ key, label }) => {
          const pct = data[key];
          return (
            <div key={key}>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>{label}</span>
                <span>{Math.round(pct)}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-primary transition-all"
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </div>
          );
        })}
        <p className="text-[11px] text-gray-500">{data.total_acciones} acciones en alcance</p>
      </CardContent>
    </Card>
  );
}
