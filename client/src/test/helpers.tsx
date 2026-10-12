import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import App from '../App';
import { AuthProvider } from '../auth/AuthProvider';
import { API_URL } from '../lib/api';

type Handler = (body: unknown) => { status?: number; body: unknown };

export const testServices = [
  {
    id: 'electrician',
    name: 'Electrician',
    nameBn: 'ইলেকট্রিশিয়ান',
    skills: [
      { id: 'fan', name: 'Ceiling fan repair and fitting' },
      { id: 'ips', name: 'IPS and UPS repair' },
    ],
  },
  {
    id: 'plumber',
    name: 'Plumber',
    nameBn: 'প্লাম্বার',
    skills: [{ id: 'tap-repair', name: 'Tap and faucet repair' }],
  },
  {
    id: 'painter',
    name: 'Painter',
    nameBn: 'রংমিস্ত্রি',
    skills: [{ id: 'touch-up', name: 'Small patch and touch-up' }],
  },
  {
    id: 'cleaner',
    name: 'Cleaner',
    nameBn: 'পরিচ্ছন্নতা কর্মী',
    skills: [{ id: 'bathroom-clean', name: 'Bathroom deep cleaning' }],
  },
];

export const testAreas = [
  { name: 'Dhanmondi', lat: 23.7461, lng: 90.3742 },
  { name: 'Mirpur', lat: 23.8223, lng: 90.3654 },
];

const defaults: Record<string, Handler> = {
  'GET /services': () => ({ body: { data: { services: testServices } } }),
  'GET /areas': () => ({ body: { data: { areas: testAreas } } }),
  'GET /technicians/me/profile': () => ({ body: { data: { profile: null } } }),
};

// fake API: keys look like "POST /auth/login"
export function mockApi(routes: Record<string, Handler>) {
  const all = { ...defaults, ...routes };
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${url.replace(API_URL, '')}`;
    const handler = all[key];
    const body =
      init?.body instanceof FormData
        ? init.body
        : init?.body
          ? JSON.parse(init.body as string)
          : undefined;
    const result = handler
      ? handler(body)
      : { status: 404, body: { error: { code: 'NOT_FOUND', message: `No mock for ${key}` } } };
    return new Response(JSON.stringify(result.body), { status: result.status ?? 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
}

export const testUsers = {
  customer: {
    id: 'u1',
    name: 'Nusrat Jahan',
    phone: '01800000001',
    role: 'customer',
    status: 'active',
  },
  technician: {
    id: 'u2',
    name: 'Jamal Hossain',
    phone: '01700000004',
    role: 'technician',
    status: 'active',
  },
  admin: { id: 'u3', name: 'Karigor Admin', phone: '01700000000', role: 'admin', status: 'active' },
} as const;
