import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageState } from '@/components/PageState';
import { SolicitudFormWizard } from '@/components/proagua/SolicitudFormWizard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/context/AppContext';
import { useAsyncData } from '@/hooks/use-async-data';
import {
  deleteSolicitud,
  fetchSolicitudes,
  presentarSolicitud,
  transitionSolicitud,
} from '@/lib/api';
import { canManageSolicitudEstatal } from '@/lib/proagua-access';
import { formatCurrency, getProgramaName } from '@/lib/utils';
import { toast } from 'sonner';
import type { SolicitudEstatus, SolicitudPrograma } from '@/types';
import { FileText, Plus } from 'lucide-react';

const ALL = '__all__';

const ESTATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  borrador: { bg: '#A0AEC015', color: '#718096', label: 'Borrador' },
  presentada: { bg: '#3182CE15', color: '#3182CE', label: 'Presentada' },
  en_revision: { bg: '#D69E2E15', color: '#D69E2E', label: 'En revision' },
  aprobada: { bg: '#38A16915', color: '#38A169', label: 'Aprobada' },
  rechazada: { bg: '#DC262615', color: '#DC2626', label: 'Rechazada' },
  observada: { bg: '#D69E2E15', color: '#D69E2E', label: 'Observada' },
};

export default function SolicitudesPage() {
  const navigate = useNavigate();
  const { user } = useApp();
  const [estatusFilter, setEstatusFilter] = useState(ALL);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = estatusFilter !== ALL ? { estatus: estatusFilter } : undefined;
    return fetchSolicitudes(params);
  }, [estatusFilter]);

  const { data, loading, error, reload } = useAsyncData(load, [load]);

  const estatusOptions = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.map((s) => s.estatus))];
  }, [data]);

  const canCreate = user?.role === 'estatal' || user?.role === 'municipal';
  const isEstatal = canManageSolicitudEstatal(user);

  const runAction = async (id: string, fn: () => Promise<SolicitudPrograma>) => {
    setBusyId(id);
    try {
      await fn();
      toast.success('Solicitud actualizada');
      reload();
    } catch {
      toast.error('No se pudo actualizar la solicitud');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      await deleteSolicitud(id);
      toast.success('Solicitud eliminada');
      reload();
    } catch {
      toast.error('No se pudo eliminar');
    } finally {
      setBusyId(null);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-brand-primary flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Solicitudes de Programa (Anexo I)
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Gestion de solicitudes PROAGUA, PEAS y PRODDER
          </p>
        </div>
        {canCreate && (
          <>
            <Button size="sm" onClick={() => setWizardOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Nueva solicitud
            </Button>
            <SolicitudFormWizard
              open={wizardOpen}
              onOpenChange={setWizardOpen}
              user={user}
              onSuccess={reload}
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Listado de solicitudes</CardTitle>
          <select
            value={estatusFilter}
            onChange={(e) => setEstatusFilter(e.target.value)}
            className="h-8 px-2 text-xs border border-gray-200 rounded-md bg-white"
          >
            <option value={ALL}>Todos los estatus</option>
            {estatusOptions.map((e) => (
              <option key={e} value={e}>
                {ESTATUS_STYLES[e]?.label ?? e}
              </option>
            ))}
          </select>
        </CardHeader>
        <CardContent>
          <PageState loading={loading} error={error} onRetry={reload}>
            {!data || data.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-8">
                No hay solicitudes registradas.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 font-medium text-gray-500">Programa</th>
                      <th className="text-center py-2 px-2 font-medium text-gray-500">EF</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-500">Municipio</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-500">Componente</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-500">Monto</th>
                      <th className="text-center py-2 px-2 font-medium text-gray-500">Estatus</th>
                      <th className="text-center py-2 px-2 font-medium text-gray-500">Obra</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-500">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((sol) => {
                      const est =
                        ESTATUS_STYLES[sol.estatus] ?? ESTATUS_STYLES.borrador;
                      const busy = busyId === sol.id;
                      return (
                        <tr key={sol.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-2 font-medium">
                            {getProgramaName(sol.programa)}
                          </td>
                          <td className="py-2 px-2 text-center">{sol.ejercicioFiscal}</td>
                          <td className="py-2 px-2">{sol.municipioNombre ?? '—'}</td>
                          <td className="py-2 px-2">{sol.componente}</td>
                          <td className="py-2 px-2 text-right font-medium">
                            {formatCurrency(sol.montoSolicitado)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <Badge
                              className="text-[9px]"
                              style={{ backgroundColor: est.bg, color: est.color }}
                            >
                              {est.label}
                            </Badge>
                          </td>
                          <td className="py-2 px-2 text-center">
                            {sol.obraResultanteId ? (
                              <button
                                type="button"
                                onClick={() => navigate(`/obras/${sol.obraResultanteId}`)}
                                className="text-[10px] text-brand-primary-light hover:underline"
                              >
                                {sol.obraResultanteFolio ?? 'Ver obra'}
                              </button>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-right">
                            <div className="flex flex-wrap justify-end gap-1">
                              {sol.estatus === 'borrador' && canCreate && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-[9px] px-2"
                                    disabled={busy}
                                    onClick={() =>
                                      void runAction(sol.id, () => presentarSolicitud(sol.id))
                                    }
                                  >
                                    Presentar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-[9px] px-2 text-red-600"
                                    disabled={busy}
                                    onClick={() => void handleDelete(sol.id)}
                                  >
                                    Eliminar
                                  </Button>
                                </>
                              )}
                              {sol.estatus === 'presentada' && isEstatal && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-[9px] px-2"
                                    disabled={busy}
                                    onClick={() =>
                                      void runAction(sol.id, () =>
                                        transitionSolicitud(sol.id, 'en_revision'),
                                      )
                                    }
                                  >
                                    A revision
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-[9px] px-2 text-red-600"
                                    disabled={busy}
                                    onClick={() =>
                                      void runAction(sol.id, () =>
                                        transitionSolicitud(sol.id, 'rechazada'),
                                      )
                                    }
                                  >
                                    Rechazar
                                  </Button>
                                </>
                              )}
                              {sol.estatus === 'en_revision' && isEstatal && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-[9px] px-2"
                                    disabled={busy}
                                    onClick={() =>
                                      void runAction(sol.id, () =>
                                        transitionSolicitud(
                                          sol.id,
                                          'aprobada',
                                          sol.obraResultanteId ?? undefined,
                                        ),
                                      )
                                    }
                                  >
                                    Aprobar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-[9px] px-2 text-red-600"
                                    disabled={busy}
                                    onClick={() =>
                                      void runAction(sol.id, () =>
                                        transitionSolicitud(sol.id, 'rechazada'),
                                      )
                                    }
                                  >
                                    Rechazar
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </PageState>
        </CardContent>
      </Card>
    </div>
  );
}

function getSolicitudBadgeColor(estatus: SolicitudEstatus): string {
  return ESTATUS_STYLES[estatus]?.color ?? '#718096';
}

export { getSolicitudBadgeColor };
