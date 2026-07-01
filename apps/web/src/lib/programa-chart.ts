import type { Accion } from '@/types';
import { getProgramaColor, getProgramaName } from '@/lib/utils';
import type { ChartPoint } from '@/lib/api';

export interface ProgramaChartSlice {
  id: string;
  nombreCorto: string;
  montoTotal: number;
  obrasCount: number;
  color: string;
}

/** Build programa donut data from API chart rows + obra amounts for investment totals. */
export function mapProgramaChartFromApi(chartRows: ChartPoint[], obras: Accion[]): ProgramaChartSlice[] {
  if (!chartRows.length) {
    const byPrograma = new Map<string, { montoTotal: number; obrasCount: number }>();
    for (const obra of obras) {
      const key = obra.programa || 'otros';
      const cur = byPrograma.get(key) ?? { montoTotal: 0, obrasCount: 0 };
      cur.montoTotal += obra.montoAutorizado;
      cur.obrasCount += 1;
      byPrograma.set(key, cur);
    }
    return [...byPrograma.entries()].map(([id, stats]) => ({
      id,
      nombreCorto: getProgramaName(id).toUpperCase(),
      montoTotal: stats.montoTotal,
      obrasCount: stats.obrasCount,
      color: getProgramaColor(id),
    }));
  }

  return chartRows.map((row) => {
    const prog = row.programa ?? '';
    const progObras = obras.filter((o) => o.programa === prog);
    const montoTotal = progObras.reduce((s, o) => s + o.montoAutorizado, 0);
    const count = Number(row.obras_count ?? row.count ?? progObras.length);
    return {
      id: prog,
      nombreCorto: getProgramaName(prog).toUpperCase(),
      montoTotal,
      obrasCount: count,
      color: getProgramaColor(prog),
    };
  });
}
