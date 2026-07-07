import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import { obraHasGeo, resolveAccionGeo } from '@/lib/api-mappers';
import type { MunicipioData, Accion } from '@/types';
import {
  formatCurrencyM,
  formatPercentage,
  getAccionStatusColor,
  getAccionStatusLabel,
} from '@/lib/utils';
import { MapPin } from 'lucide-react';
import { getBrand } from '@/config/brand';

interface MapaTerritorialProps {
  municipios: MunicipioData[];
  obras: Accion[];
}

const DEFAULT_CENTER: LatLngExpression = [23.6345, -102.5528];
const DEFAULT_ZOOM = 5;

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 12 });
    }
  }, [map, bounds]);
  return null;
}

export function MapaTerritorial({ municipios, obras }: MapaTerritorialProps) {
  const { entity } = getBrand();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const georeferenced = useMemo(
    () =>
      obras
        .map((o) => ({ obra: o, geo: resolveAccionGeo(o) }))
        .filter((item): item is { obra: Accion; geo: { latitud: number; longitud: number } } =>
          item.geo !== null,
        ),
    [obras],
  );
  const withoutCoords = obras.length - georeferenced.length;

  const bounds = useMemo((): LatLngBoundsExpression | null => {
    if (georeferenced.length === 0) return null;
    const lats = georeferenced.map((o) => o.geo.latitud);
    const lngs = georeferenced.map((o) => o.geo.longitud);
    return [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ];
  }, [georeferenced]);

  const center = useMemo((): LatLngExpression => {
    if (georeferenced.length === 0) {
      const munWithGeo = municipios.filter((m) => obraHasGeo(m));
      if (munWithGeo.length > 0) {
        const lat =
          munWithGeo.reduce((s, m) => s + m.latitud, 0) / munWithGeo.length;
        const lng =
          munWithGeo.reduce((s, m) => s + m.longitud, 0) / munWithGeo.length;
        return [lat, lng];
      }
      return DEFAULT_CENTER;
    }
    const lat = georeferenced.reduce((s, o) => s + o.geo.latitud, 0) / georeferenced.length;
    const lng = georeferenced.reduce((s, o) => s + o.geo.longitud, 0) / georeferenced.length;
    return [lat, lng];
  }, [georeferenced, municipios]);

  if (!mounted) {
    return (
      <div
        className="w-full rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-sm text-gray-500"
        style={{ height: '420px' }}
      >
        Cargando mapa…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-600">
        <span className="inline-flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-brand-primary" />
          {georeferenced.length} {entity.singular}{georeferenced.length === 1 ? '' : 's'} georreferenciada
          {georeferenced.length !== obras.length ? ` de ${obras.length}` : ''}
        </span>
        {withoutCoords > 0 && (
          <span className="text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
            {withoutCoords} sin coordenadas (no se muestran en el mapa)
          </span>
        )}
        <span className="flex flex-wrap gap-2 ml-auto">
          {[
            'en_ejecucion_a_tiempo',
            'en_ejecucion_retraso',
            'en_riesgo',
            'concluida',
          ].map((estatus) => (
            <span key={estatus} className="inline-flex items-center gap-1">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: getAccionStatusColor(estatus) }}
              />
              {getAccionStatusLabel(estatus)}
            </span>
          ))}
        </span>
      </div>

      <div
        className="w-full rounded-lg overflow-hidden border border-gray-200 z-0"
        style={{ height: '420px' }}
      >
        <MapContainer
          center={center}
          zoom={georeferenced.length > 0 ? 8 : DEFAULT_ZOOM}
          scrollWheelZoom
          className="h-full w-full"
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {bounds && <FitBounds bounds={bounds} />}
          {georeferenced.map(({ obra, geo }) => (
            <CircleMarker
              key={obra.id}
              center={[geo.latitud, geo.longitud]}
              radius={8}
              pathOptions={{
                color: '#fff',
                weight: 2,
                fillColor: getAccionStatusColor(obra.estatus),
                fillOpacity: 0.9,
              }}
              eventHandlers={{
                click: () => navigate(`/acciones/${obra.id}`),
              }}
            >
              <Popup>
                <div className="text-xs space-y-1 min-w-[180px]">
                  <p className="font-semibold text-gray-900 leading-tight">{obra.nombre}</p>
                  <p className="text-gray-500">{obra.folio} · {obra.municipio}</p>
                  <p>
                    <span
                      className="font-medium"
                      style={{ color: getAccionStatusColor(obra.estatus) }}
                    >
                      {getAccionStatusLabel(obra.estatus)}
                    </span>
                  </p>
                  <p>Avance físico: {formatPercentage(obra.avanceFisicoReal)}</p>
                  <p>Inversión: {formatCurrencyM(obra.montoAutorizado)}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {georeferenced.length === 0 && (
        <p className="text-xs text-gray-500 text-center py-2">
          No hay {entity.plural} con latitud y longitud registradas. Agregue coordenadas en la ficha de cada {entity.singular}
          para visualizarlas en el mapa.
        </p>
      )}
    </div>
  );
}
