import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Booking } from '../../lib/bookings';
import { fakeLive } from '../../test/fake-live';
import { mockApi, renderAt, testUsers } from '../../test/helpers';
import type { TechnicianProfile } from './profile-types';

const home = { lat: 23.8223, lng: 90.3654 };

const profile = (extra: Partial<TechnicianProfile> = {}): TechnicianProfile => ({
  id: 'p1',
  serviceIds: ['plumber'],
  skillIds: ['tap-repair'],
  areaName: 'Mirpur',
  // about 1.2 km south of the customer's pin
  location: { type: 'Point', coordinates: [home.lng, home.lat - 1.2 / 111.32] },
  serviceRadiusKm: 10,
  workingDays: [6, 0, 1, 2, 3, 4],
  workingHours: { start: '09:00', end: '20:00' },
  experienceYears: 5,
  acceptingJobs: true,
  approvalStatus: 'approved',
  hasNidPhoto: true,
  ...extra,
});

function job(extra: Partial<Booking> = {}): Booking {
  return {
    id: 'b1',
    problemId: 'r1',
    status: 'requested',
    serviceId: 'plumber',
    serviceName: 'Plumber',
    scheduledAt: '2026-10-18T04:00:00.000Z',
    emergency: false,
    location: home,
    addressText: null,
    note: '',
    estimate: { min: 400, max: 800 },
    finalPrice: null,
    cancelReason: null,
    createdAt: '2026-10-17T04:00:00.000Z',
    problem: {
      text: 'kal theke pani porche',
      summary: 'Kitchen tap is leaking.',
      urgency: 'normal',
    },
    technician: { id: 'u2', name: 'Jamal Hossain', phone: null, rating: 4.6, ratingCount: 14 },
    customer: { id: 'c1', name: 'Nusrat J.', phone: null },
    statusHistory: [{ status: 'requested', at: '2026-10-17T04:00:00.000Z', by: 'customer' }],
    actions: ['accepted', 'rejected'],
    ...extra,
  };
}

function signedIn(routes: Parameters<typeof mockApi>[0], me = profile()) {
  localStorage.setItem('karigor.token', 'saved-token');
  return mockApi({
    'GET /auth/me': () => ({ body: { data: { user: testUsers.technician } } }),
    'GET /technicians/me/profile': () => ({ body: { data: { profile: me } } }),
    'GET /areas': () => ({ body: { data: { areas: [{ name: 'Mirpur', ...home }] } } }),
    ...routes,
  });
}

const sent = (fetchMock: ReturnType<typeof mockApi>, method: string, path: string) => {
  const call = fetchMock.mock.calls.find(
    ([url, init]) => init?.method === method && String(url).endsWith(path),
  );
  return call ? JSON.parse(call[1]!.body as string) : undefined;
};

describe('My jobs', () => {
  it('sorts jobs into tabs with emergencies first', async () => {
    signedIn({
      'GET /bookings': () => ({
        body: {
          data: {
            bookings: [
              job(),
              job({
                id: 'b2',
                emergency: true,
                serviceId: 'electrician',
                serviceName: 'Electrician',
                problem: {
                  text: 'spark',
                  summary: 'Sparks from the switch board.',
                  urgency: 'emergency',
                },
              }),
              job({ id: 'b3', status: 'accepted', actions: ['on_the_way'] }),
              job({ id: 'b4', status: 'completed', finalPrice: 450, actions: [] }),
            ],
          },
        },
      }),
    });
    const user = userEvent.setup();
    renderAt('/tech/jobs');

    // the page loads three things at once, which can take a moment when every test runs together
    const cards = await screen.findAllByRole('link', { name: /View request/ }, { timeout: 4000 });
    expect(cards).toHaveLength(2);
    expect(within(cards[0]!).getByText('Emergency · now')).toBeInTheDocument();
    expect(within(cards[1]!).getByText(/Mirpur · 1.2 km away/)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Upcoming (1)' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Done (1)' }));
    expect(screen.getByText('৳450')).toBeInTheDocument();
  });

  it('turns taking jobs off and on', async () => {
    const fetchMock = signedIn({
      'GET /bookings': () => ({ body: { data: { bookings: [] } } }),
      'PATCH /technicians/me/availability': () => ({
        body: { data: { profile: profile({ acceptingJobs: false }) } },
      }),
    });
    const user = userEvent.setup();
    renderAt('/tech/jobs');

    await user.click(await screen.findByRole('switch', { name: 'Taking jobs' }));

    expect(await screen.findByText(/not taking jobs right now/)).toBeInTheDocument();
    expect(sent(fetchMock, 'PATCH', '/technicians/me/availability')).toEqual({
      acceptingJobs: false,
    });
  });

  it('explains that jobs come after approval', async () => {
    signedIn(
      { 'GET /bookings': () => ({ body: { data: { bookings: [] } } }) },
      profile({ approvalStatus: 'pending' }),
    );
    renderAt('/tech/jobs');

    expect(await screen.findByText('Not approved yet.')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });
});

describe('Job details', () => {
  it('hides the address until accepting, then shows where to go', async () => {
    const fetchMock = signedIn({
      'GET /bookings/b1': () => ({ body: { data: { booking: job() } } }),
      'PATCH /bookings/b1/status': () => ({
        body: {
          data: {
            booking: job({
              status: 'accepted',
              addressText: 'House 12, Road 5, Flat 3B',
              note: 'Ring twice',
              customer: { id: 'c1', name: 'Nusrat Jahan', phone: '01812345678' },
              actions: ['on_the_way'],
            }),
          },
        },
      }),
    });
    const user = userEvent.setup();
    renderAt('/tech/jobs/b1');

    expect(await screen.findByText('Kitchen tap is leaking.')).toBeInTheDocument();
    expect(
      screen.getByText(/full address and phone number show after you accept/),
    ).toBeInTheDocument();
    expect(screen.queryByText('House 12, Road 5, Flat 3B')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Accept' }));

    expect(await screen.findByText('House 12, Road 5, Flat 3B')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Call' })).toHaveAttribute('href', 'tel:01812345678');
    expect(screen.getByRole('button', { name: "I'm on the way" })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
    expect(sent(fetchMock, 'PATCH', '/bookings/b1/status')).toEqual({ status: 'accepted' });
  });

  it('asks before rejecting', async () => {
    const fetchMock = signedIn({
      'GET /bookings/b1': () => ({ body: { data: { booking: job() } } }),
      'PATCH /bookings/b1/status': () => ({
        body: { data: { booking: job({ status: 'rejected', actions: [] }) } },
      }),
    });
    const user = userEvent.setup();
    renderAt('/tech/jobs/b1');

    await user.click(await screen.findByRole('button', { name: 'Reject' }));
    const dialog = screen.getByRole('dialog', { name: 'Reject this job?' });
    await user.click(within(dialog).getByRole('button', { name: 'Reject' }));

    const progress = await screen.findByRole('list', { name: 'Booking progress' });
    expect(await within(progress).findByText('Not accepted')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
    expect(sent(fetchMock, 'PATCH', '/bookings/b1/status')).toEqual({ status: 'rejected' });
  });

  it('needs the final price to complete the job', async () => {
    const fetchMock = signedIn({
      'GET /bookings/b1': () => ({
        body: {
          data: {
            booking: job({
              status: 'arrived',
              addressText: 'House 12, Road 5, Flat 3B',
              customer: { id: 'c1', name: 'Nusrat Jahan', phone: '01812345678' },
              actions: ['completed'],
            }),
          },
        },
      }),
      'PATCH /bookings/b1/status': () => ({
        body: { data: { booking: job({ status: 'completed', finalPrice: 450, actions: [] }) } },
      }),
    });
    const user = userEvent.setup();
    renderAt('/tech/jobs/b1');

    await user.click(await screen.findByRole('button', { name: 'Mark as completed' }));
    expect(screen.getByText('Write the price in whole taka, like 450')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Final price paid in cash'), '450');
    await user.click(screen.getByRole('button', { name: 'Mark as completed' }));

    expect(await screen.findByText('৳450')).toBeInTheDocument();
    expect(sent(fetchMock, 'PATCH', '/bookings/b1/status')).toEqual({
      status: 'completed',
      finalPrice: 450,
    });
  });
});

describe('Job chat', () => {
  it('lets the technician chat once the job is accepted', async () => {
    signedIn({
      'GET /bookings/b1': () => ({
        body: {
          data: {
            booking: job({
              status: 'accepted',
              addressText: 'House 12, Road 5, Flat 3B',
              customer: { id: 'c1', name: 'Nusrat Jahan', phone: '01812345678' },
              actions: ['on_the_way'],
              statusHistory: [
                { status: 'requested', at: '2026-10-17T04:00:00.000Z', by: 'customer' },
                { status: 'accepted', at: '2026-10-17T04:10:00.000Z', by: 'technician' },
              ],
            }),
          },
        },
      }),
      'GET /bookings/b1/messages': () => ({
        body: {
          data: {
            chatOpen: true,
            messages: [
              {
                id: 'm1',
                bookingId: 'b1',
                text: 'Ring twice',
                at: '2026-10-17T04:12:00.000Z',
                from: 'customer',
              },
            ],
          },
        },
      }),
    });
    fakeLive.answerSend = (data) => ({
      ok: true,
      message: {
        id: 'm2',
        bookingId: data.bookingId,
        text: data.text,
        at: '2026-10-17T04:13:00.000Z',
        from: 'technician',
      },
    });
    const user = userEvent.setup();
    renderAt('/tech/jobs/b1');

    const chat = await screen.findByRole('region', { name: 'Chat with Nusrat' });
    expect(await within(chat).findByText('Ring twice')).toBeInTheDocument();
    await user.type(within(chat).getByLabelText('Message to Nusrat'), 'On my way');
    await user.click(within(chat).getByRole('button', { name: 'Send' }));
    expect(await within(chat).findByText('On my way')).toBeInTheDocument();
  });
});
