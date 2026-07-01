import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ComboBox } from '@/components/ui/combobox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TopContratistaChartRow } from '@/types';
import { getBrand } from '@/config/brand';
import { formatCurrencyM, formatPercentage } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  /** Highlights the row/bar for the contractor selected in the panel header */
  highlightContratistaId?: string;
  /** Contractor name shown in contextual subtitle */
  contextLabel?: string;
}

export function RankingContratistasChart({
  rows,
  programas,
  programaFilter,
  onProgramaFilterChange,
  highlightContratistaId,
  contextLabel,
}: RankingContratistasChartProps) {
  const brand = getBrand();
  const { entity } = brand;
  const navigate = useNavigate();

  const programaOptions = useMemo(
    () => [
      { value: '__all__', label: 'Todos los programas' },
      ...programas.map((p) => ({ value: p.id, label: p.label })),
    ],
    [programas],
  );

  const highlightIndex = useMemo(
    () =>
      highlightContratistaId
        ? rows.findIndex((r) => r.contratistaId === highlightContratistaId)
        : -1,
    [rows, highlightContratistaId],
  );

  const chartData = useMemo(
    () =>
      rows.slice(0, 10).map((row, index) => ({
        ...row,
        rank: index + 1,
        isHighlighted: row.contratistaId === highlightContratistaId,
        label:
          row.contratista.length > 22
            ? `${row.contratista.slice(0, 22)}…`
            : row.contratista,
      })),
    [rows, highlightContratistaId],
  );

  const contextMessage = useMemo(() => {
    if (!contextLabel) return null;
    if (highlightIndex >= 0) {
      return `${contextLabel} ocupa el puesto #${highlightIndex + 1} en este ranking.`;
    }
    if (programaFilter !== '__all__') {
      return `${contextLabel} no aparece en el top 10 para el programa seleccionado.`;
    }
    return `Comparativa de contratistas para contextualizar a ${contextLabel}.`;
  }, [contextLabel, highlightIndex, programaFilter]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold text-gray-900">
              Ranking contratistas por programa
            </CardTitle>
            {contextMessage && (
              <p className="text-[11px] text-gray-500 mt-1">{contextMessage}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="text-[10px]">
              Top {Math.min(rows.length, 10)}
            </Badge>
            {programas.length > 0 && (
              <ComboBox
                options={programaOptions}
                value={programaFilter}
                onValueChange={onProgramaFilterChange}
                placeholder="Programa"
                searchPlaceholder="Buscar programa..."
                triggerClassName="w-[220px] sm:w-[260px]"
                className="w-[220px] sm:w-[260px]"
              />
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
                    if (name === 'obrasCount') return [`${value} ${entity.plural}`, entity.pluralCap];
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
                  radius={[0, 3, 3, 0]}
                  cursor="pointer"
                  onClick={(data) => {
                    const id = (data as { contratistaId?: string }).contratistaId;
                    if (id) navigate(`/contratistas/${id}`);
                  }}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.contratistaId ?? entry.contratista}
                      fill={entry.isHighlighted ? brand.colors.accent : brand.colors.primary}
                      stroke={entry.isHighlighted ? brand.colors.accent : undefined}
                      strokeWidth={entry.isHighlighted ? 2 : 0}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-500">#</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500">Contratista</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500">{entity.pluralCap}</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500">Avance prom.</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((row, i) => {
                    const isHighlighted = row.contratistaId === highlightContratistaId;
                    return (
                      <tr
                        key={row.contratistaId ?? row.contratista}
                        className={cn(
                          'border-b border-gray-100 hover:bg-gray-50 cursor-pointer',
                          isHighlighted && 'bg-brand-primary/5 border-l-2 border-l-brand-accent',
                        )}
                        onClick={() =>
                          row.contratistaId && navigate(`/contratistas/${row.contratistaId}`)
                        }
                      >
                        <td className="py-2 px-2">{i + 1}</td>
                        <td className="py-2 px-2 font-medium text-gray-900">
                          <span className="flex items-center gap-2 min-w-0">
                            <span className="truncate">{row.contratista}</span>
                            {isHighlighted && (
                              <Badge variant="secondary" className="text-[9px] shrink-0">
                                Seleccionado
                              </Badge>
                            )}
                          </span>
                        </td>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
