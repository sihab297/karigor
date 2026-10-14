import type { LatLng } from '../pages/technician/profile-types';
import { isInsideDhaka } from './geo';

// rejects with a message that can be shown as it is
export function findMyLocation(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error("Your browser can't share your location. Drag the pin instead."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const point = { lat: coords.latitude, lng: coords.longitude };
        if (isInsideDhaka(point)) resolve(point);
        else
          reject(
            new Error('You seem to be outside Dhaka. Pick your area and drag the pin instead.'),
          );
      },
      () => reject(new Error("We couldn't get your location. Drag the pin instead.")),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  });
}
