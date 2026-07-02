import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { EvmPortfolio } from '@/lib/api';
import { TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface EvmSummaryChartProps {
  data: EvmPortfolio;
}

export function EvmSummaryChart({ data }: EvmSummaryChartProps) {
  const chartData = data.acciones
    .filter((a) => a.spi !== null || a.cpi !== null)
    .slice(0, 12)
    .map((a) => ({
      name: a.folio.length > 12 ? `${a.folio.slice(0, 12)}…` : a.folio,
      spi: a.spi ?? 0,
      cpi: a.cpi ?? 0,
    }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          EVM — SPI / CPI por acción
        </CardTitle>
        <p className="text-xs text-gray-500">
          Promedio SPI {data.promedio_spi?.toFixed(2) ?? '—'} · CPI {data.promedio_cpi?.toFixed(2) ?? '—'} (1.0 = meta)
        </p>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-sm text-gray-500">Sin métricas EVM. Ejecute recomputo de métricas.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis domain={[0, 1.5]} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => v.toFixed(2)} />
              <ReferenceLine y={1} stroke="#718096" strokeDasharray="4 4" />
              <Bar dataKey="spi" name="SPI" fill="#3182CE" radius={[2, 2, 0, 0]} />
              <Bar dataKey="cpi" name="CPI" fill="#38A169" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
