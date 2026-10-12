import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import App from '../App';
import { AuthProvider } from '../auth/AuthProvider';
import { API_URL } from '../lib/api';

type Handler = (body: unknown) => { status?: number; body: unknown };

// fake API: keys look like "POST /auth/login"
export function mockApi(routes: Record<string, Handler>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${url.replace(API_URL, '')}`;
    const handler = routes[key];
    const result = handler
      ? handler(init?.body ? JSON.parse(init.body as string) : undefined)
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
