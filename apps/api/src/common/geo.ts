import type { Decimal } from '@prisma/client/runtime/library';

type GeoSource = {
  latitud?: Decimal | number | null;
  longitud?: Decimal | number | null;
  obraFisica?: { latitud?: Decimal | number | null; longitud?: Decimal | number | null } | null;
};

function toNum(v: Decimal | number | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function hasValidGeoCoords(latitud: number, longitud: number): boolean {
  if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) return false;
  if (latitud === 0 && longitud === 0) return false;
  return Math.abs(latitud) <= 90 && Math.abs(longitud) <= 180;
}

/** Prefer obra física coordinates; fall back to legacy acción columns during transition. */
export function resolveAccionGeoCoords(
  source: GeoSource,
): { latitud: number; longitud: number } | null {
  const of = source.obraFisica;
  if (of) {
    const lat = toNum(of.latitud);
    const lng = toNum(of.longitud);
    if (lat != null && lng != null && hasValidGeoCoords(lat, lng)) {
      return { latitud: lat, longitud: lng };
    }
  }
  const lat = toNum(source.latitud);
  const lng = toNum(source.longitud);
  if (lat != null && lng != null && hasValidGeoCoords(lat, lng)) {
    return { latitud: lat, longitud: lng };
  }
  return null;
}

export function accionHasGeo(source: GeoSource): boolean {
  return resolveAccionGeoCoords(source) !== null;
}
