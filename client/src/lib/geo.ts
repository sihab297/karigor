import type { Area, LatLng } from '../pages/technician/profile-types';

export const DHAKA_CENTER: LatLng = { lat: 23.7808, lng: 90.4 };

const BOUNDS = { minLat: 23.6, maxLat: 23.95, minLng: 90.3, maxLng: 90.55 };

export function isInsideDhaka({ lat, lng }: LatLng) {
  return (
    lat >= BOUNDS.minLat && lat <= BOUNDS.maxLat && lng >= BOUNDS.minLng && lng <= BOUNDS.maxLng
  );
}

// good enough for picking the closest area inside one city
export function nearestArea(point: LatLng, areas: Area[]) {
  let best: Area | undefined;
  let bestDistance = Infinity;
  for (const area of areas) {
    const distance = (area.lat - point.lat) ** 2 + (area.lng - point.lng) ** 2;
    if (distance < bestDistance) {
      best = area;
      bestDistance = distance;
    }
  }
  return best;
}

// straight-line distance in km (haversine)
export function distanceKm(a: LatLng, b: LatLng) {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
