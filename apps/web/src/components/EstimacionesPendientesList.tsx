import { useEffect, useState } from 'react';
import { fetchEstimacionesByObra } from '@/lib/api';
import type { Estimacion, Accion } from '@/types';
import { formatCurrency } from '@/lib/utils';

const PENDING_ESTATUS = new Set<Estimacion['estatus']>(['presentada', 'en_revision_municipal']);

type PendingRow = { estimacion: Estimacion; obra: Accion };

interface EstimacionesPendientesListProps {
  obras: Accion[];
  onValidate: (estimacionId: string, aprobar: boolean) => void | Promise<void>;
  busyId: string | null;
}

export function EstimacionesPendientesList({ obras, onValidate, busyId }: EstimacionesPendientesListProps) {
  const [rows, setRows] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const pending: PendingRow[] = [];
        for (const obra of obras) {
          const estimaciones = await fetchEstimacionesByObra(obra.id);
          for (const estimacion of estimaciones) {
            if (PENDING_ESTATUS.has(estimacion.estatus)) {
              pending.push({ estimacion, obra });
            }
          }
        }
        if (!cancelled) setRows(pending);
      } catch {
        if (!cancelled) setLoadError('No se pudieron cargar estimaciones pendientes.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [obras]);

  return (
    <div className="mt-6 pt-4 border-t border-gray-200">
      <h4 className="text-xs font-semibold text-gray-900 mb-3">Estimaciones pendientes de validación municipal</h4>
      {loadError && <p className="text-xs text-red-600 mb-2">{loadError}</p>}
      {loading && <p className="text-xs text-gray-400 py-2">Cargando...</p>}
      {!loading && rows.length === 0 && (
        <p className="text-xs text-gray-400 py-2">No hay estimaciones pendientes de validacion.</p>
      )}
      <div className="space-y-2">
        {rows.map(({ estimacion, obra }) => (
          <div
            key={estimacion.id}
            className="flex items-center justify-between gap-3 p-3 border border-gray-200 rounded-lg"
          >
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{obra.nombre}</p>
              <p className="text-[10px] text-gray-500">
                #{estimacion.numero} — {estimacion.periodo} — {formatCurrency(estimacion.montoEstimado)} —{' '}
                {estimacion.estatus}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                type="button"
                disabled={busyId === estimacion.id}
                onClick={() => onValidate(estimacion.id, true)}
                className="px-3 py-1.5 bg-[#38A169] text-white text-[10px] font-medium rounded-md hover:bg-[#2F855A] disabled:opacity-60"
              >
                Aprobar
              </button>
              <button
                type="button"
                disabled={busyId === estimacion.id}
                onClick={() => onValidate(estimacion.id, false)}
                className="px-3 py-1.5 bg-red-500 text-white text-[10px] font-medium rounded-md hover:bg-red-600 disabled:opacity-60"
              >
                Observar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
