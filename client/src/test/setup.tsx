import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// the real map needs a browser; tests get a stand-in that shows the pin as text
vi.mock('../components/profile/LocationPicker', () => ({
  LocationPicker: ({ value }: { value: { lat: number; lng: number } | null }) => (
    <div data-testid="map">{value ? `pin ${value.lat},${value.lng}` : 'no pin'}</div>
  ),
}));

URL.createObjectURL ??= () => 'blob:preview';
URL.revokeObjectURL ??= () => undefined;

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});
