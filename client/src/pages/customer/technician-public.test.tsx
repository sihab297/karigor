import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mockApi, renderAt, testUsers } from '../../test/helpers';

const rahim = {
  id: 't1',
  name: 'Rahim Uddin',
  areaName: 'Mirpur',
  experienceYears: 6,
  rating: 4.8,
  ratingCount: 2,
  jobsDone: 57,
  services: [
    {
      id: 'plumber',
      name: 'Plumber',
      jobsDone: 49,
      skills: [
        { id: 'tap-repair', name: 'Tap and faucet repair' },
        { id: 'pipe-leak', name: 'Pipe leak repair' },
      ],
    },
  ],
  workingDays: [6, 0, 1, 2, 3, 4],
  workingHours: { start: '09:00', end: '20:00' },
  acceptingJobs: true,
  memberSince: '2026-10-01T00:00:00.000Z',
};

function signedIn(routes: Parameters<typeof mockApi>[0]) {
  localStorage.setItem('karigor.token', 'saved-token');
  return mockApi({
    'GET /auth/me': () => ({ body: { data: { user: testUsers.customer } } }),
    ...routes,
  });
}

describe('Technician public profile', () => {
  it('shows the facts, skills, hours and reviews', async () => {
    signedIn({
      'GET /technicians/t1': () => ({ body: { data: { technician: rahim } } }),
      'GET /technicians/t1/reviews': () => ({
        body: {
          data: {
            total: 1,
            reviews: [
              {
                id: 'r1',
                rating: 5,
                comment: 'Came on time',
                serviceName: 'Plumber',
                at: '2026-10-28T10:00:00.000Z',
                customerName: 'Nusrat J.',
              },
            ],
          },
        },
      }),
    });
    renderAt('/technicians/t1');

    expect(await screen.findByRole('heading', { name: 'Rahim Uddin' })).toBeInTheDocument();
    expect(screen.getByText('NID checked by Karigor')).toBeInTheDocument();
    expect(screen.getByText('57')).toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: 'Plumber skills' })).getByText(
        'Tap and faucet repair',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Works Sat to Thu, 9:00 AM to 8:00 PM/)).toBeInTheDocument();
    const reviews = screen.getByRole('region', { name: /Reviews/ });
    expect(within(reviews).getByText('Nusrat J.')).toBeInTheDocument();
    expect(within(reviews).getByText('Came on time')).toBeInTheDocument();
    expect(within(reviews).getByRole('img', { name: '5 out of 5 stars' })).toBeInTheDocument();
  });

  it('says when there are no reviews yet', async () => {
    signedIn({
      'GET /technicians/t1': () => ({
        body: { data: { technician: { ...rahim, rating: null, ratingCount: 0 } } },
      }),
      'GET /technicians/t1/reviews': () => ({ body: { data: { total: 0, reviews: [] } } }),
    });
    renderAt('/technicians/t1');

    expect(await screen.findByText(/No reviews yet/)).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it("doesn't call a rated technician new when there are no written reviews", async () => {
    signedIn({
      'GET /technicians/t1': () => ({ body: { data: { technician: rahim } } }),
      'GET /technicians/t1/reviews': () => ({ body: { data: { total: 0, reviews: [] } } }),
    });
    renderAt('/technicians/t1');

    expect(await screen.findByText(/No written reviews to show yet/)).toBeInTheDocument();
    expect(screen.queryByText(/is new on Karigor/)).not.toBeInTheDocument();
  });

  it('says so when the profile is not open', async () => {
    signedIn({
      'GET /technicians/t9': () => ({
        status: 404,
        body: {
          error: { code: 'TECHNICIAN_NOT_FOUND', message: "We couldn't find this karigor." },
        },
      }),
      'GET /technicians/t9/reviews': () => ({
        status: 404,
        body: {
          error: { code: 'TECHNICIAN_NOT_FOUND', message: "We couldn't find this karigor." },
        },
      }),
    });
    renderAt('/technicians/t9');

    expect(
      await screen.findByRole('heading', { name: "We couldn't find this karigor" }),
    ).toBeInTheDocument();
  });
});
