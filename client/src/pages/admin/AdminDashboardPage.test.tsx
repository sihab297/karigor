import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mockApi, renderAt, testUsers } from '../../test/helpers';

const stats = {
  users: { customers: 248, newCustomersThisWeek: 12, technicians: 41 },
  technicians: { waiting: 3, approved: 36, rejected: 2, takingJobs: 30 },
  bookings: {
    today: 17,
    emergenciesToday: 2,
    thisMonthByStatus: [
      { status: 'requested', count: 14 },
      { status: 'accepted', count: 19 },
      { status: 'rejected', count: 4 },
      { status: 'cancelled', count: 7 },
      { status: 'on_the_way', count: 6 },
      { status: 'arrived', count: 0 },
      { status: 'completed', count: 64 },
    ],
    thisMonthByService: [
      { serviceId: 'electrician', serviceName: 'Electrician', count: 31 },
      { serviceId: 'plumber', serviceName: 'Plumber', count: 27 },
    ],
  },
  problemChecksThisMonth: 120,
};

function signedInAdmin(routes: Parameters<typeof mockApi>[0]) {
  localStorage.setItem('karigor.token', 'saved-token');
  return mockApi({
    'GET /auth/me': () => ({ body: { data: { user: testUsers.admin } } }),
    ...routes,
  });
}

describe('Admin dashboard', () => {
  it('shows the key numbers and the bookings this month', async () => {
    signedInAdmin({ 'GET /admin/stats': () => ({ body: { data: stats } }) });
    renderAt('/admin');

    expect(await screen.findByText('248')).toBeInTheDocument();
    expect(screen.getByText('+12 this week')).toBeInTheDocument();
    expect(screen.getByText('30 taking jobs')).toBeInTheDocument();
    expect(screen.getByText('2 emergencies')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Waiting for approval/ })).toHaveAttribute(
      'href',
      '/admin/technicians',
    );

    const byStatus = screen.getByRole('list', { name: 'Bookings this month by status' });
    const statusRows = within(byStatus).getAllByRole('listitem');
    expect(statusRows).toHaveLength(7);
    // the order a job goes through, then cancelled and not accepted
    expect(statusRows.map((row) => row.firstElementChild?.textContent)).toEqual([
      'Requested',
      'Accepted',
      'On the way',
      'Arrived',
      'Completed',
      'Cancelled',
      'Not accepted',
    ]);
    expect(within(byStatus).getByText('Completed')).toBeInTheDocument();
    expect(within(byStatus).getByText('64')).toBeInTheDocument();
    expect(screen.getByText('114 in total')).toBeInTheDocument();

    const byService = screen.getByRole('list', { name: 'Bookings this month by service' });
    expect(within(byService).getByText('Electrician')).toBeInTheDocument();
  });

  it('shows an error with a way to try again', async () => {
    signedInAdmin({
      'GET /admin/stats': () => ({
        status: 500,
        body: { error: { code: 'SERVER_ERROR', message: 'Something went wrong.' } },
      }),
    });
    renderAt('/admin');

    expect(await screen.findByText('Something went wrong.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
