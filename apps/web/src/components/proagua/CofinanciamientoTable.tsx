import { useCallback } from 'react';
import { PageState } from '@/components/PageState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAsyncData } from '@/hooks/use-async-data';
import { fetchCofinanciamientosByObra } from '@/lib/api';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import type { CofinanciamientoFuente } from '@/types';

const FUENTE_LABELS: Record<string, string> = {
  federal: 'Federal',
  estatal: 'Estatal',
  municipal: 'Municipal',
  organismo_operador: 'Organismo Operador (OO)',
};

const FUENTE_COLORS: Record<string, string> = {
  federal: '#1B3664',
  estatal: '#2A6F97',
  municipal: '#3B83BD',
  organismo_operador: '#C5A059',
};

const FUENTE_ORDER: CofinanciamientoFuente[] = [
  'federal',
  'estatal',
  'municipal',
  'organismo_operador',
];

interface CofinanciamientoTableProps {
  obraId: string;
}

export function CofinanciamientoTable({ obraId }: CofinanciamientoTableProps) {
  const load = useCallback(async () => {
    const rows = await fetchCofinanciamientosByObra(obraId);
    const sorted = [...rows].sort((a, b) => {
      const ia = FUENTE_ORDER.indexOf(a.fuente as CofinanciamientoFuente);
      const ib = FUENTE_ORDER.indexOf(b.fuente as CofinanciamientoFuente);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    const total = sorted.reduce((s, r) => s + r.monto, 0);
    return { rows: sorted, total };
  }, [obraId]);

  const { data, loading, error, reload } = useAsyncData(load, [load]);

  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Cofinanciamiento</CardTitle>
        </CardHeader>
        <CardContent>
          <PageState loading={loading} error={error} onRetry={reload}>
            <span />
          </PageState>
        </CardContent>
      </Card>
    );
  }

  const { rows, total } = data;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Cofinanciamiento por Fuente</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-xs text-gray-500 py-4 text-center">
            No hay registros de cofinanciamiento para esta obra.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-medium text-gray-500">Fuente</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-500">Monto (MXN)</th>
                  <th className="text-center py-2 px-2 font-medium text-gray-500">%</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-500">Descripcion</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-2">
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                        style={{ backgroundColor: FUENTE_COLORS[row.fuente] ?? '#718096' }}
                      >
                        {FUENTE_LABELS[row.fuente] ?? row.fuente}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right font-medium">{formatCurrency(row.monto)}</td>
                    <td className="py-2 px-2 text-center">{formatPercentage(row.porcentaje)}</td>
                    <td className="py-2 px-2 text-gray-600">{row.descripcion ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td className="py-2 px-2 font-semibold text-gray-900">Total</td>
                  <td className="py-2 px-2 text-right font-semibold text-brand-primary">
                    {formatCurrency(total)}
                  </td>
                  <td className="py-2 px-2 text-center font-semibold">100%</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
