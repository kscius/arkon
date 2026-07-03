import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { PageState } from '@/components/PageState';
import { useAsyncData } from '@/hooks/use-async-data';
import { fetchObraFisica } from '@/lib/api';
import {
  formatCurrencyM,
  formatPercentage,
  getObraStatusColor,
  getObraStatusLabel,
  getProgramaColor,
  getProgramaName,
  getTipoObraLabel,
} from '@/lib/utils';
import { getBrand } from '@/config/brand';
import { isValidUuid } from '@/lib/ids';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TruncateTooltip } from '@/components/ui/truncate-tooltip';
import { Building2, MapPin, Activity, DollarSign } from 'lucide-react';

export default function ObraFisicaDetailPage() {
  const { obraId } = useParams<{ obraId: string }>();
  const brand = getBrand();
  const { entity, obraEntity } = brand;
  const [mapMounted, setMapMounted] = useState(false);

  useEffect(() => {
    setMapMounted(true);
  }, []);

  const load = useCallback(async () => {
    if (!obraId) throw new Error(`${obraEntity.singularCap} no especificada`);
    if (!isValidUuid(obraId)) {
      throw new Error(
        `Identificador de ${obraEntity.singular} no válido. Abra la ${obraEntity.singular} desde el catálogo.`,
      );
    }
    return fetchObraFisica(obraId);
  }, [obraId, obraEntity]);

  const { data: obra, loading, error, reload } = useAsyncData(load, [load]);

  const hasGeo = obra?.latitud != null && obra?.longitud != null && obra.latitud !== 0 && obra.longitud !== 0;
  const acciones = useMemo(() => obra?.acciones ?? [], [obra?.acciones]);

  return (
    <PageState loading={loading} error={error} onRetry={reload}>
      {obra && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6">
            <div className="flex flex-wrap items-start gap-3">
              <Building2 className="w-6 h-6 text-brand-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-lg lg:text-xl font-bold text-brand-primary">{obra.nombre}</h1>
                  <Badge variant="outline" className="text-[10px]">
                    {obra.clave}
                  </Badge>
                  <Badge className="text-[10px] bg-brand-secondary text-white">
                    {obra.estatusFisico.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500">
                  {obra.municipio} — {obra.localidad}
                </p>
                {obra.descripcion && (
                  <p className="text-xs text-gray-400 mt-2">{obra.descripcion}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-1 text-[10px] text-gray-500 uppercase mb-1">
                  <Activity className="w-3 h-3" />
                  Acciones
                </div>
                <div className="text-xl font-bold">{obra.accionesCount}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-1 text-[10px] text-gray-500 uppercase mb-1">
                  <DollarSign className="w-3 h-3" />
                  Autorizado
                </div>
                <div className="text-xl font-bold">{formatCurrencyM(obra.montoAutorizadoTotal)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-[10px] text-gray-500 uppercase">Ejercido</span>
                <div className="text-xl font-bold mt-1">{formatCurrencyM(obra.montoEjercidoTotal)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-[10px] text-gray-500 uppercase">Avance físico prom.</span>
                <div className="text-xl font-bold mt-1">{formatPercentage(obra.avanceFisicoPromedio)}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Atributos físicos</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Tipo de obra</span>
                  <span className="font-medium">{getTipoObraLabel(obra.tipoObra)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Entidad federativa</span>
                  <span className="font-medium">{obra.entidadFederativaNombre || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Organismo operador</span>
                  <span className="font-medium">{obra.organismoOperadorNombre || '—'}</span>
                </div>
                {obra.poblacionBeneficiada != null && obra.poblacionBeneficiada > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Población beneficiada</span>
                    <span className="font-medium">{obra.poblacionBeneficiada.toLocaleString('es-MX')}</span>
                  </div>
                )}
                {obra.programas.length > 0 && (
                  <div className="pt-2">
                    <span className="text-gray-500 block mb-1">Programas</span>
                    <div className="flex flex-wrap gap-1">
                      {obra.programas.map((p) => (
                        <Link key={p} to={`/programas/${p}`}>
                          <Badge
                            className="text-[10px] hover:opacity-90"
                            style={{ backgroundColor: getProgramaColor(p), color: 'white' }}
                          >
                            {getProgramaName(p)}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Ubicación
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hasGeo && mapMounted ? (
                  <div className="h-48 rounded-lg overflow-hidden border border-gray-200">
                    <MapContainer
                      center={[obra.latitud!, obra.longitud!]}
                      zoom={13}
                      className="h-full w-full"
                      scrollWheelZoom={false}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <CircleMarker
                        center={[obra.latitud!, obra.longitud!]}
                        radius={10}
                        pathOptions={{ color: brand.colors.primary, fillColor: brand.colors.accent, fillOpacity: 0.8 }}
                      >
                        <Popup>{obra.nombre}</Popup>
                      </CircleMarker>
                    </MapContainer>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 py-6 text-center">
                    Sin coordenadas geográficas registradas para esta {obraEntity.singular}.
                  </p>
                )}
                {hasGeo && (
                  <p className="text-[10px] text-gray-400 mt-2">
                    {obra.latitud?.toFixed(5)}, {obra.longitud?.toFixed(5)}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                {`Acciones vinculadas (${acciones.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 font-medium text-gray-500">Folio</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-500">{entity.singularCap}</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-500">Programa</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-500">Contratista</th>
                      <th className="text-center py-2 px-2 font-medium text-gray-500">Avance</th>
                      <th className="text-center py-2 px-2 font-medium text-gray-500">Estatus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {acciones.map((accion) => (
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
                        <td className="py-2 px-2">
                          {accion.programa && (
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                              style={{ backgroundColor: getProgramaColor(accion.programa) }}
                            >
                              {getProgramaName(accion.programa)}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-gray-600">
                          {accion.contratistaNombre ?? accion.contratista ?? '—'}
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
                {acciones.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-10">
                    {`No hay ${entity.plural} vinculadas a esta ${obraEntity.singular}.`}
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
