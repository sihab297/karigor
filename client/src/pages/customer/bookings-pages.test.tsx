import { act, cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Booking } from '../../lib/bookings';
import { fakeLive } from '../../test/fake-live';
import { mockApi, renderAt, testUsers } from '../../test/helpers';

function booking(extra: Partial<Booking> = {}): Booking {
  return {
    id: 'b1',
    problemId: 'r1',
    status: 'requested',
    serviceId: 'plumber',
    serviceName: 'Plumber',
    scheduledAt: '2026-10-18T04:00:00.000Z',
    emergency: false,
    location: { lat: 23.8223, lng: 90.3654 },
    addressText: 'House 12, Road 5, Flat 3B',
    note: '',
    estimate: { min: 400, max: 800 },
    finalPrice: null,
    cancelReason: null,
    createdAt: '2026-10-17T04:00:00.000Z',
    problem: {
      text: 'kitchen tap leaking',
      summary: 'The kitchen tap is leaking.',
      urgency: 'normal',
    },
    technician: { id: 't1', name: 'Rahim Uddin', phone: null, rating: 4.6, ratingCount: 14 },
    customer: { id: 'c1', name: 'Nusrat Jahan', phone: null },
    statusHistory: [{ status: 'requested', at: '2026-10-17T04:00:00.000Z', by: 'customer' }],
    actions: ['cancelled'],
    review: null,
    canReview: false,
    ...extra,
  };
}

function signedIn(routes: Parameters<typeof mockApi>[0]) {
  localStorage.setItem('karigor.token', 'saved-token');
  return mockApi({
    'GET /auth/me': () => ({ body: { data: { user: testUsers.customer } } }),
    ...routes,
  });
}

describe('My bookings', () => {
  it('splits bookings into active and past', async () => {
    signedIn({
      'GET /bookings': () => ({
        body: {
          data: {
            bookings: [
              booking(),
              booking({
                id: 'b2',
                status: 'completed',
                finalPrice: 450,
                serviceId: 'ac-repair',
                serviceName: 'AC repair',
                actions: [],
              }),
            ],
          },
        },
      }),
    });
    const user = userEvent.setup();
    renderAt('/bookings');

    const active = await screen.findByRole('link', { name: /Plumber/ });
    expect(active).toHaveAttribute('href', '/bookings/b1');
    expect(within(active).getByText('Waiting for reply')).toBeInTheDocument();
    expect(within(active).getByText(/Sun 18 Oct, 10:00 AM · ৳400 – ৳800/)).toBeInTheDocument();
    expect(screen.queryByText('AC repair')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Past (1)' }));
    const past = screen.getByRole('link', { name: /AC repair/ });
    expect(within(past).getByText('Completed')).toBeInTheDocument();
    expect(within(past).getByText(/Paid ৳450/)).toBeInTheDocument();
  });

  it('helps a customer with no bookings get started', async () => {
    signedIn({ 'GET /bookings': () => ({ body: { data: { bookings: [] } } }) });
    renderAt('/bookings');

    expect(await screen.findByText('No active bookings.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Get help now' })).toHaveAttribute('href', '/request');
  });
});

describe('Booking details', () => {
  it('shows the progress, the karigor and the details', async () => {
    signedIn({
      'GET /bookings/b1': () => ({
        body: {
          data: {
            booking: booking({
              status: 'on_the_way',
              actions: [],
              technician: {
                id: 't1',
                name: 'Rahim Uddin',
                phone: '01700000001',
                rating: 4.6,
                ratingCount: 14,
              },
              statusHistory: [
                { status: 'requested', at: '2026-10-17T04:00:00.000Z', by: 'customer' },
                { status: 'accepted', at: '2026-10-17T04:10:00.000Z', by: 'technician' },
                { status: 'on_the_way', at: '2026-10-18T03:40:00.000Z', by: 'technician' },
              ],
            }),
          },
        },
      }),
    });
    renderAt('/bookings/b1');

    expect(await screen.findByRole('heading', { name: 'Plumber' })).toBeInTheDocument();
    const progress = screen.getByRole('list', { name: 'Booking progress' });
    expect(within(progress).getByText('(now)')).toBeInTheDocument();
    expect(within(progress).getByText(/On the way/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Call' })).toHaveAttribute('href', 'tel:01700000001');
    expect(screen.getByText('House 12, Road 5, Flat 3B')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument();
    expect(screen.getByText(/can't be cancelled here/)).toBeInTheDocument();
  });

  it('cancels an accepted booking only with a reason', async () => {
    const fetchMock = signedIn({
      'GET /bookings/b1': () => ({ body: { data: { booking: booking({ status: 'accepted' }) } } }),
      'PATCH /bookings/b1/status': () => ({
        body: {
          data: {
            booking: booking({
              status: 'cancelled',
              cancelReason: 'The leak stopped by itself',
              actions: [],
              statusHistory: [
                { status: 'requested', at: '2026-10-17T04:00:00.000Z', by: 'customer' },
                { status: 'accepted', at: '2026-10-17T04:10:00.000Z', by: 'technician' },
                { status: 'cancelled', at: '2026-10-17T05:00:00.000Z', by: 'customer' },
              ],
            }),
          },
        },
      }),
    });
    const user = userEvent.setup();
    renderAt('/bookings/b1');

    await user.click(await screen.findByRole('button', { name: 'Cancel booking' }));
    const dialog = screen.getByRole('dialog', { name: 'Cancel this booking?' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel booking' }));
    expect(within(dialog).getByText('Tell Rahim why you are cancelling')).toBeInTheDocument();

    await user.type(
      within(dialog).getByLabelText(/Why are you cancelling/),
      'The leak stopped by itself',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Cancel booking' }));

    const progress = await screen.findByRole('list', { name: 'Booking progress' });
    expect(await within(progress).findByText(/Cancelled/)).toBeInTheDocument();
    expect(within(progress).getByText('“The leak stopped by itself”')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument();
    const call = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(JSON.parse(call![1]!.body as string)).toEqual({
      status: 'cancelled',
      reason: 'The leak stopped by itself',
    });
  });

  it('offers another karigor after a "no"', async () => {
    signedIn({
      'GET /bookings/b1': () => ({
        body: { data: { booking: booking({ status: 'rejected', actions: [] }) } },
      }),
    });
    renderAt('/bookings/b1');

    expect(await screen.findByText("Rahim couldn't take this job.")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Choose another karigor' })).toHaveAttribute(
      'href',
      '/request/r1',
    );
  });

  it('says so when the booking is not found', async () => {
    signedIn({
      'GET /bookings/b9': () => ({
        status: 404,
        body: { error: { code: 'BOOKING_NOT_FOUND', message: "We couldn't find this booking." } },
      }),
    });
    renderAt('/bookings/b9');

    expect(
      await screen.findByRole('heading', { name: "We couldn't find this booking" }),
    ).toBeInTheDocument();
  });
});

describe('Chat and live updates', () => {
  it('chats with the karigor and shows status changes without refreshing', async () => {
    let calls = 0;
    signedIn({
      'GET /bookings/b1': () => {
        calls += 1;
        return {
          body: {
            data: {
              booking: booking({
                status: calls === 1 ? 'accepted' : 'on_the_way',
                actions: calls === 1 ? ['cancelled'] : [],
                technician: {
                  id: 't1',
                  name: 'Rahim Uddin',
                  phone: '01700000001',
                  rating: 4.6,
                  ratingCount: 14,
                },
                statusHistory: [
                  { status: 'requested', at: '2026-10-17T04:00:00.000Z', by: 'customer' },
                  { status: 'accepted', at: '2026-10-17T04:10:00.000Z', by: 'technician' },
                ],
              }),
            },
          },
        };
      },
      'GET /bookings/b1/messages': () => ({
        body: {
          data: {
            chatOpen: true,
            messages: [
              {
                id: 'm1',
                bookingId: 'b1',
                text: 'Coming at 10',
                at: '2026-10-17T04:11:00.000Z',
                from: 'technician',
              },
            ],
          },
        },
      }),
    });
    const user = userEvent.setup();
    renderAt('/bookings/b1');

    const chat = await screen.findByRole('region', { name: 'Chat with Rahim' });
    expect(await within(chat).findByText('Coming at 10')).toBeInTheDocument();
    expect(fakeLive.sent).toContainEqual({ event: 'booking:join', data: { bookingId: 'b1' } });

    await user.type(within(chat).getByLabelText('Message to Rahim'), 'Gate is on the left');
    await user.click(within(chat).getByRole('button', { name: 'Send' }));
    expect(await within(chat).findByText('Gate is on the left')).toBeInTheDocument();
    expect(fakeLive.sent).toContainEqual({
      event: 'message:send',
      data: { bookingId: 'b1', text: 'Gate is on the left' },
    });
    expect(within(chat).getByLabelText('Message to Rahim')).toHaveValue('');

    act(() =>
      fakeLive.serverSends('message:new', {
        id: 'm9',
        bookingId: 'b1',
        text: 'Almost there',
        at: '2026-10-17T05:00:00.000Z',
        from: 'technician',
      }),
    );
    expect(await within(chat).findByText('Almost there')).toBeInTheDocument();

    act(() => fakeLive.serverSends('booking:status', { bookingId: 'b1', status: 'on_the_way' }));
    expect(await screen.findByText(/can't be cancelled here/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument();
  });

  it('says when the chat opens, and keeps it read-only after the job', async () => {
    signedIn({ 'GET /bookings/b1': () => ({ body: { data: { booking: booking() } } }) });
    renderAt('/bookings/b1');
    expect(await screen.findByText('The chat opens when Rahim accepts.')).toBeInTheDocument();
    cleanup();

    signedIn({
      'GET /bookings/b2': () => ({
        body: {
          data: {
            booking: booking({
              id: 'b2',
              status: 'completed',
              finalPrice: 450,
              actions: [],
              statusHistory: [
                { status: 'requested', at: '2026-10-17T04:00:00.000Z', by: 'customer' },
                { status: 'accepted', at: '2026-10-17T04:10:00.000Z', by: 'technician' },
                { status: 'completed', at: '2026-10-18T05:00:00.000Z', by: 'technician' },
              ],
            }),
          },
        },
      }),
      'GET /bookings/b2/messages': () => ({ body: { data: { chatOpen: false, messages: [] } } }),
    });
    renderAt('/bookings/b2');
    expect(await screen.findByText(/The chat is closed for this booking/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Message to Rahim')).not.toBeInTheDocument();
  });

  it('shows why a message was not sent', async () => {
    signedIn({
      'GET /bookings/b1': () => ({
        body: {
          data: {
            booking: booking({
              status: 'accepted',
              statusHistory: [
                { status: 'requested', at: '2026-10-17T04:00:00.000Z', by: 'customer' },
                { status: 'accepted', at: '2026-10-17T04:10:00.000Z', by: 'technician' },
              ],
            }),
          },
        },
      }),
      'GET /bookings/b1/messages': () => ({ body: { data: { chatOpen: true, messages: [] } } }),
    });
    fakeLive.answerSend = () => ({
      ok: false,
      code: 'CHAT_CLOSED',
      error: 'The chat is closed for this booking.',
    });
    const user = userEvent.setup();
    renderAt('/bookings/b1');

    const input = await screen.findByLabelText('Message to Rahim');
    await user.type(input, 'Hello');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('The chat is closed for this booking.')).toBeInTheDocument();
    expect(input).toHaveValue('Hello');
  });
});

describe('Review', () => {
  const done = (extra: Partial<Booking> = {}) =>
    booking({
      status: 'completed',
      finalPrice: 450,
      actions: [],
      canReview: true,
      statusHistory: [
        { status: 'requested', at: '2026-10-17T04:00:00.000Z', by: 'customer' },
        { status: 'accepted', at: '2026-10-17T04:10:00.000Z', by: 'technician' },
        { status: 'completed', at: '2026-10-18T05:00:00.000Z', by: 'technician' },
      ],
      ...extra,
    });

  it('rates the karigor after the job, once', async () => {
    const fetchMock = signedIn({
      'GET /bookings/b1': () => ({ body: { data: { booking: done() } } }),
      'GET /bookings/b1/messages': () => ({ body: { data: { chatOpen: false, messages: [] } } }),
      'POST /bookings/b1/review': () => ({
        status: 201,
        body: {
          data: {
            review: { rating: 4, comment: 'Fair price', at: '2026-10-18T06:00:00.000Z' },
          },
        },
      }),
    });
    const user = userEvent.setup();
    renderAt('/bookings/b1');

    const form = await screen.findByRole('form', { name: 'Review Rahim' });
    await user.click(within(form).getByRole('button', { name: 'Post review' }));
    expect(within(form).getByText('Choose 1 to 5 stars')).toBeInTheDocument();

    await user.click(within(form).getByRole('radio', { name: '4 stars: Good' }));
    expect(within(form).getByRole('radio', { name: '4 stars: Good' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await user.type(within(form).getByLabelText(/Anything to add/), 'Fair price');
    await user.click(within(form).getByRole('button', { name: 'Post review' }));

    const posted = await screen.findByRole('region', { name: 'Your review' });
    expect(within(posted).getByRole('img', { name: '4 out of 5 stars' })).toBeInTheDocument();
    expect(within(posted).getByText('“Fair price”')).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Review Rahim' })).not.toBeInTheDocument();
    const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/review'));
    expect(JSON.parse(call![1]!.body as string)).toEqual({ rating: 4, comment: 'Fair price' });
  });

  it('picks stars with the arrow keys', async () => {
    signedIn({
      'GET /bookings/b1': () => ({ body: { data: { booking: done() } } }),
      'GET /bookings/b1/messages': () => ({ body: { data: { chatOpen: false, messages: [] } } }),
    });
    const user = userEvent.setup();
    renderAt('/bookings/b1');

    const first = await screen.findByRole('radio', { name: '1 star: Poor' });
    first.focus();
    // nothing is chosen at first, so three presses give three stars
    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');

    const three = screen.getByRole('radio', { name: '3 stars: OK' });
    expect(three).toHaveAttribute('aria-checked', 'true');
    expect(three).toHaveFocus();
  });

  it('shows the review already given instead of the form', async () => {
    signedIn({
      'GET /bookings/b1': () => ({
        body: {
          data: {
            booking: done({
              canReview: false,
              review: { rating: 5, comment: '', at: '2026-10-18T06:00:00.000Z' },
            }),
          },
        },
      }),
      'GET /bookings/b1/messages': () => ({ body: { data: { chatOpen: false, messages: [] } } }),
    });
    renderAt('/bookings/b1');

    const posted = await screen.findByRole('region', { name: 'Your review' });
    expect(within(posted).getByRole('img', { name: '5 out of 5 stars' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Post review' })).not.toBeInTheDocument();
  });
});
