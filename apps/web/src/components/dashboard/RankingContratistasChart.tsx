import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TopContratistaChartRow } from '@/types';
import { getBrand } from '@/config/brand';
import { formatCurrencyM, formatPercentage } from '@/lib/utils';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface RankingContratistasChartProps {
  rows: TopContratistaChartRow[];
  programas: { id: string; label: string }[];
  programaFilter: string;
  onProgramaFilterChange: (value: string) => void;
}

export function RankingContratistasChart({
  rows,
  programas,
  programaFilter,
  onProgramaFilterChange,
}: RankingContratistasChartProps) {
  const brand = getBrand();
  const navigate = useNavigate();

  const chartData = useMemo(
    () =>
      rows.slice(0, 10).map((row) => ({
        ...row,
        label:
          row.contratista.length > 22
            ? `${row.contratista.slice(0, 22)}…`
            : row.contratista,
      })),
    [rows],
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-base font-semibold text-gray-900">
            Ranking contratistas por programa
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              Top {Math.min(rows.length, 10)}
            </Badge>
            {programas.length > 0 && (
              <Select value={programaFilter} onValueChange={onProgramaFilterChange}>
                <SelectTrigger className="h-8 w-[200px] text-xs">
                  <SelectValue placeholder="Programa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__" className="text-xs">
                    Todos los programas
                  </SelectItem>
                  {programas.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            Sin datos de contratistas para el filtro seleccionado.
          </p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={130}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'obrasCount') return [`${value} obras`, 'Obras'];
                    if (name === 'avancePromedio') return [formatPercentage(value), 'Avance prom.'];
                    return [value, name];
                  }}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.contratista ?? ''
                  }
                />
                <Bar
                  dataKey="obrasCount"
                  name="obrasCount"
                  fill={brand.colors.primary}
                  radius={[0, 3, 3, 0]}
                  cursor="pointer"
                  onClick={(data) => {
                    const id = (data as { contratistaId?: string }).contratistaId;
                    if (id) navigate(`/contratistas/${id}`);
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-500">#</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500">Contratista</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500">Obras</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500">Avance prom.</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((row, i) => (
                    <tr
                      key={row.contratistaId ?? row.contratista}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() =>
                        row.contratistaId && navigate(`/contratistas/${row.contratistaId}`)
                      }
                    >
                      <td className="py-2 px-2">{i + 1}</td>
                      <td className="py-2 px-2 font-medium text-gray-900">{row.contratista}</td>
                      <td className="py-2 px-2 text-center">{row.obrasCount}</td>
                      <td className="py-2 px-2 text-center">
                        {row.avancePromedio != null
                          ? formatPercentage(row.avancePromedio)
                          : '—'}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {row.montoTotal != null ? formatCurrencyM(row.montoTotal) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
