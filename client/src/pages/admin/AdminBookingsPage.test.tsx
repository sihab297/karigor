import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Booking } from '../../lib/bookings';
import { mockApi, renderAt, testUsers } from '../../test/helpers';
import type { AdminUser } from './admin-types';

const booking = (extra: Partial<Booking> = {}): Booking => ({
  id: '6729a1c4e1f0a1b2c3d4e5f6',
  problemId: 'r1',
  status: 'completed',
  serviceId: 'plumber',
  serviceName: 'Plumber',
  scheduledAt: '2026-11-06T04:00:00.000Z',
  emergency: false,
  location: { lat: 23.8, lng: 90.36 },
  addressText: 'House 12',
  note: '',
  estimate: null,
  finalPrice: 450,
  cancelReason: null,
  createdAt: '2026-11-05T04:00:00.000Z',
  problem: null,
  technician: { id: 't1', name: 'Rahim Uddin', phone: '017', rating: 4.8, ratingCount: 3 },
  customer: { id: 'c1', name: 'Nusrat Jahan', phone: '018' },
  statusHistory: [],
  actions: [],
  review: null,
  canReview: false,
  ...extra,
});

const user = (extra: Partial<AdminUser>): AdminUser => ({
  id: 'u1',
  name: 'Nusrat Jahan',
  phone: '01812345678',
  email: null,
  role: 'customer',
  status: 'active',
  joinedAt: '2026-10-01T00:00:00.000Z',
  bookings: 3,
  ...extra,
});

function signedInAdmin(routes: Parameters<typeof mockApi>[0]) {
  localStorage.setItem('karigor.token', 'saved-token');
  return mockApi({
    'GET /auth/me': () => ({ body: { data: { user: testUsers.admin } } }),
    ...routes,
  });
}

const page = { total: 1, page: 1, pageSize: 20 };

describe('Admin bookings and users', () => {
  it('lists bookings and filters them by status', async () => {
    const fetchMock = signedInAdmin({
      'GET /admin/bookings?page=1': () => ({
        body: { data: { ...page, bookings: [booking()] } },
      }),
      'GET /admin/bookings?page=1&status=completed': () => ({
        body: { data: { ...page, bookings: [booking()] } },
      }),
    });
    const userEv = userEvent.setup();
    renderAt('/admin/bookings');

    const list = await screen.findByRole('list', { name: 'Bookings' });
    expect(within(list).getByText('#D4E5F6 · Plumber')).toBeInTheDocument();
    expect(within(list).getByText('Nusrat Jahan → Rahim Uddin')).toBeInTheDocument();
    expect(within(list).getByText(/৳450/)).toBeInTheDocument();
    expect(screen.getByText('Showing 1–1 of 1')).toBeInTheDocument();

    await userEv.click(screen.getByRole('button', { name: 'Completed' }));
    expect(screen.getByRole('button', { name: 'Completed' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('status=completed'))).toBe(
      true,
    );
  });

  it('blocks a user after asking, and unblocks', async () => {
    let users = [
      user({}),
      user({ id: 'u2', name: 'Arif Khan', status: 'blocked' }),
      user({ id: 'u3', name: 'Karigor Admin', role: 'admin' }),
    ];
    const fetchMock = signedInAdmin({
      'GET /admin/bookings?page=1': () => ({ body: { data: { ...page, bookings: [] } } }),
      'GET /admin/users?page=1': () => ({ body: { data: { ...page, total: 3, users } } }),
      'PATCH /admin/users/u1/status': () => {
        users = users.map((u) => (u.id === 'u1' ? { ...u, status: 'blocked' } : u));
        return { body: { data: {} } };
      },
      'PATCH /admin/users/u2/status': () => ({ body: { data: {} } }),
    });
    const userEv = userEvent.setup();
    renderAt('/admin/bookings');

    await userEv.click(await screen.findByRole('tab', { name: 'Users' }));
    const list = await screen.findByRole('list', { name: 'Users' });
    const admin = within(list).getByText('Karigor Admin').closest('li')!;
    expect(within(admin).queryByRole('button')).not.toBeInTheDocument();

    const nusrat = within(list).getByText('Nusrat Jahan').closest('li')!;
    await userEv.click(within(nusrat).getByRole('button', { name: 'Block' }));
    const dialog = screen.getByRole('dialog', { name: 'Block Nusrat Jahan?' });
    await userEv.click(within(dialog).getByRole('button', { name: 'Block' }));

    expect(await within(nusrat).findByText('Blocked')).toBeInTheDocument();
    const blockCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/u1/status'));
    expect(JSON.parse(blockCall![1]!.body as string)).toEqual({ status: 'blocked' });

    const arif = within(list).getByText('Arif Khan').closest('li')!;
    await userEv.click(within(arif).getByRole('button', { name: 'Unblock' }));
    const unblockCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/u2/status'));
    expect(JSON.parse(unblockCall![1]!.body as string)).toEqual({ status: 'active' });
  });
});
