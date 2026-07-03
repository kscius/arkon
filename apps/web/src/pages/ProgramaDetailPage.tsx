import { useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageState } from '@/components/PageState';
import { useAsyncData } from '@/hooks/use-async-data';
import { fetchProgramaAcciones, fetchProgramas } from '@/lib/api';
import {
  formatCurrencyM,
  formatPercentage,
  getObraStatusColor,
  getObraStatusLabel,
  getProgramaColor,
  getProgramaName,
} from '@/lib/utils';
import { getBrand } from '@/config/brand';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TruncateTooltip } from '@/components/ui/truncate-tooltip';
import { ArrowLeft, Building2, Layers } from 'lucide-react';

export default function ProgramaDetailPage() {
  const { programaId } = useParams<{ programaId: string }>();
  const brand = getBrand();
  const { entity, obraEntity } = brand;
  const navigate = useNavigate();

  const load = useCallback(async () => {
    if (!programaId) throw new Error('Programa no especificado');
    const [programas, acciones] = await Promise.all([
      fetchProgramas(),
      fetchProgramaAcciones(programaId),
    ]);
    const programa = programas.find((p) => p.id === programaId);
    if (!programa) throw new Error('Programa no encontrado');
    return { programa, acciones };
  }, [programaId]);

  const { data, loading, error, reload } = useAsyncData(load, [load]);

  return (
    <PageState loading={loading} error={error} onRetry={reload}>
      {data && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6">
            <Button
              variant="ghost"
              size="sm"
              className="mb-3 -ml-2 text-xs text-gray-500"
              onClick={() => navigate('/programas')}
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Volver a programas
            </Button>
            <div className="flex flex-wrap items-start gap-3">
              <Layers className="w-6 h-6 text-brand-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-lg font-bold text-brand-primary">{data.programa.nombre}</h1>
                  <Badge
                    className="text-[10px]"
                    style={{ backgroundColor: getProgramaColor(data.programa.id), color: 'white' }}
                  >
                    {getProgramaName(data.programa.id)}
                  </Badge>
                </div>
                {data.programa.descripcion && (
                  <p className="text-sm text-gray-500">{data.programa.descripcion}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-[10px] text-gray-500 uppercase">Acciones</span>
                <div className="text-xl font-bold">{data.programa.accionesCount}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-[10px] text-gray-500 uppercase">{obraEntity.pluralCap}</span>
                <div className="text-xl font-bold">{data.programa.obrasCount}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-[10px] text-gray-500 uppercase">Inversión</span>
                <div className="text-xl font-bold">{formatCurrencyM(data.programa.montoAutorizado)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-[10px] text-gray-500 uppercase">Avance físico</span>
                <div className="text-xl font-bold">{formatPercentage(data.programa.avanceFisicoPromedio)}</div>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{`Acciones del programa (${data.acciones.length})`}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 font-medium text-gray-500">Folio</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-500">{entity.singularCap}</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-500">Municipio</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-500">{obraEntity.singularCap}</th>
                      <th className="text-center py-2 px-2 font-medium text-gray-500">Avance</th>
                      <th className="text-center py-2 px-2 font-medium text-gray-500">Estatus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.acciones.map((accion) => (
                      <tr key={accion.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-2">
                          <Link
                            to={`/acciones/${accion.id}`}
                            className="text-brand-primary hover:underline font-medium"
                          >
                            {accion.folio}
                          </Link>
                        </td>
                        <td className="py-2 px-2">
                          <TruncateTooltip text={accion.nombre} maxWidthClass="max-w-[200px]" />
                        </td>
                        <td className="py-2 px-2 text-gray-600">{accion.municipio}</td>
                        <td className="py-2 px-2">
                          {accion.obraFisicaId ? (
                            <Link
                              to={`/obras/${accion.obraFisicaId}`}
                              className="text-brand-secondary hover:underline inline-flex items-center gap-1"
                            >
                              <Building2 className="w-3 h-3" />
                              {accion.obraFisicaNombre ?? accion.obraFisicaClave ?? obraEntity.singular}
                            </Link>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center">{formatPercentage(accion.avanceFisicoReal)}</td>
                        <td className="py-2 px-2 text-center">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                            style={{ backgroundColor: getObraStatusColor(accion.estatus) }}
                          >
                            {getObraStatusLabel(accion.estatus)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.acciones.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-10">
                    No hay acciones registradas para este programa.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageState>
  );
}
