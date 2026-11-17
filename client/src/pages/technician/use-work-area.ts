import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { distanceKm, nearestArea } from '../../lib/geo';
import type { Area, LatLng, TechnicianProfile } from './profile-types';

// the technician's own profile and the area list, to describe where each job is
export function useWorkArea() {
  const [profile, setProfile] = useState<TechnicianProfile | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);

  useEffect(() => {
    let stillHere = true;
    api<{ profile: TechnicianProfile | null }>('/technicians/me/profile')
      .then((data) => stillHere && setProfile(data.profile))
      .catch(() => undefined);
    api<{ areas: Area[] }>('/areas')
      .then((data) => stillHere && setAreas(data.areas))
      .catch(() => undefined);
    return () => {
      stillHere = false;
    };
  }, []);

  // "Mirpur · 1.2 km away"
  function describePlace(point: LatLng) {
    const area = nearestArea(point, areas)?.name;
    const [lng, lat] = profile?.location.coordinates ?? [];
    const km = lat !== undefined && lng !== undefined ? distanceKm({ lat, lng }, point) : undefined;
    const away = km !== undefined ? `${km < 10 ? km.toFixed(1) : Math.round(km)} km away` : '';
    return [area, away].filter(Boolean).join(' · ');
  }

  return { profile, setProfile, describePlace };
}
