import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import type { GeoAggregate } from '@/lib/api';
import { formatCurrencyM, formatPercentage } from '@/lib/utils';
import { Layers } from 'lucide-react';

type MetricKey = 'riesgo_promedio' | 'avance_promedio' | 'gap_index' | 'inversion_per_capita';

interface GeoDecisionMapProps {
  aggregates: GeoAggregate[];
}

const metricLabel: Record<MetricKey, string> = {
  riesgo_promedio: 'Riesgo promedio',
  avance_promedio: 'Avance físico',
  gap_index: 'Índice de brecha',
  inversion_per_capita: 'Inversión per cápita',
};

function colorFor(value: number, metric: MetricKey): string {
  if (metric === 'riesgo_promedio' || metric === 'gap_index') {
    if (value >= 60) return '#DC2626';
    if (value >= 30) return '#D69E2E';
    return '#38A169';
  }
  if (value >= 70) return '#38A169';
  if (value >= 40) return '#D69E2E';
  return '#DC2626';
}

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [32, 32], maxZoom: 10 });
  }, [map, bounds]);
  return null;
}

export function GeoDecisionMap({ aggregates }: GeoDecisionMapProps) {
  const [mounted, setMounted] = useState(false);
  const [metric, setMetric] = useState<MetricKey>('riesgo_promedio');

  useEffect(() => setMounted(true), []);

  const withCoords = useMemo(
    () => aggregates.filter((a) => a.latitud != null && a.longitud != null),
    [aggregates],
  );

  const bounds = useMemo((): LatLngBoundsExpression | null => {
    if (withCoords.length === 0) return null;
    const lats = withCoords.map((a) => a.latitud!);
    const lngs = withCoords.map((a) => a.longitud!);
    return [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ];
  }, [withCoords]);

  const center: LatLngExpression = useMemo(() => {
    if (withCoords.length === 0) return [23.63, -102.55];
    const lat = withCoords.reduce((s, a) => s + a.latitud!, 0) / withCoords.length;
    const lng = withCoords.reduce((s, a) => s + a.longitud!, 0) / withCoords.length;
    return [lat, lng];
  }, [withCoords]);

  const maxVal = useMemo(() => {
    const vals = withCoords.map((a) => Number(a[metric]) || 0);
    return Math.max(...vals, 1);
  }, [withCoords, metric]);

  if (!mounted) {
    return (
      <div className="h-[420px] rounded-lg border bg-gray-50 flex items-center justify-center text-sm text-gray-500">
        Cargando mapa GIS…
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Layers className="w-4 h-4 text-gray-500" />
        <span className="text-gray-600">Capa:</span>
        {(Object.keys(metricLabel) as MetricKey[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setMetric(k)}
            className={`px-2 py-1 rounded text-xs border ${
              metric === k ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-gray-700'
            }`}
          >
            {metricLabel[k]}
          </button>
        ))}
      </div>
      <div className="rounded-lg border overflow-hidden" style={{ height: 420 }}>
        <MapContainer center={center} zoom={6} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds bounds={bounds} />
          {withCoords.map((a) => {
            const val = Number(a[metric]) || 0;
            const radius = 8 + (val / maxVal) * 22;
            return (
              <CircleMarker
                key={a.municipio_id}
                center={[a.latitud!, a.longitud!]}
                radius={radius}
                pathOptions={{
                  color: colorFor(val, metric),
                  fillColor: colorFor(val, metric),
                  fillOpacity: 0.65,
                  weight: a.es_zap ? 3 : 1,
                }}
              >
                <Popup>
                  <div className="text-sm space-y-1 min-w-[180px]">
                    <p className="font-semibold">{a.municipio}</p>
                    {a.es_zap && <p className="text-xs text-amber-700">Zona de Atención Prioritaria</p>}
                    <p>Acciones: {a.obras_count}</p>
                    <p>Inversión: {formatCurrencyM(a.inversion_total)}</p>
                    <p>Avance: {formatPercentage(a.avance_promedio)}</p>
                    <p>Riesgo prom.: {Math.round(a.riesgo_promedio)}</p>
                    <p>Brecha: {Math.round(a.gap_index)}</p>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
