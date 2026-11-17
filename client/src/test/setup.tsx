import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { closeLiveSocket } from '../lib/live';
import { resetFakeLive } from './fake-live';

// the real map needs a browser; tests get a stand-in that shows the pin as text
vi.mock('../components/profile/LocationPicker', () => ({
  LocationPicker: ({ value }: { value: { lat: number; lng: number } | null }) => (
    <div data-testid="map">{value ? `pin ${value.lat},${value.lng}` : 'no pin'}</div>
  ),
}));

// pages load a few things at once; when every test runs together that can take over the
// default 1 second, so findBy... waits a little longer
configure({ asyncUtilTimeout: 4000 });

// pages open a live connection; tests get a fake one they can talk to (see fake-live.ts)
vi.mock('socket.io-client', async () => {
  const { fakeIo } = await import('./fake-live');
  return { io: fakeIo };
});

let previewCount = 0;
URL.createObjectURL ??= () => `blob:preview-${previewCount++}`;
URL.revokeObjectURL ??= () => undefined;

afterEach(() => {
  cleanup();
  closeLiveSocket();
  resetFakeLive();
  localStorage.clear();
  vi.unstubAllGlobals();
});
