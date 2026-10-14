import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { nextDays } from '../../lib/dhaka-time';
import type { Match, MatchResult, ProblemReport } from '../../pages/customer/problem-types';
import { mockApi, renderAt, testUsers } from '../../test/helpers';

const report: ProblemReport = {
  id: 'r1',
  mode: 'describe',
  text: 'kol theke pani porche',
  photoUrls: [],
  createdAt: '2026-10-14T08:00:00.000Z',
  ai: {
    understood: true,
    serviceId: 'plumber',
    serviceName: 'Plumber',
    skillIds: ['tap-repair'],
    summary: 'The kitchen tap is leaking.',
    urgency: 'normal',
    confidence: 'high',
    emergencyType: null,
    safetyTips: [],
    emergencyNumber: null,
    priceLines: [],
    estimate: { min: 400, max: 800 },
    matchesChosenService: true,
    followUpQuestion: null,
    model: 'mock',
    latencyMs: 1,
  },
};

const emergencyReport: ProblemReport = {
  ...report,
  ai: {
    ...report.ai!,
    urgency: 'emergency',
    safetyTips: ['Open the windows.'],
    emergencyNumber: '999',
  },
};

function match(name: string, extra: Partial<Match> = {}): Match {
  return {
    technicianId: name,
    name,
    areaName: 'Mirpur',
    distanceKm: 0.4,
    rating: 4.6,
    ratingCount: 14,
    jobsDone: 18,
    experienceYears: 8,
    matchedSkills: [{ id: 'tap-repair', name: 'Tap and faucet repair' }],
    bestMatch: false,
    ...extra,
  };
}

const threeMatches = [
  match('Rahim Uddin', { bestMatch: true }),
  match('Kamal Hossain', {
    areaName: 'Shyamoli',
    distanceKm: 4,
    rating: null,
    ratingCount: 0,
    jobsDone: 0,
    experienceYears: 0,
  }),
  match('Abdul Karim', { areaName: 'Dhanmondi', distanceKm: 8.6, matchedSkills: [] }),
];

function openResult(
  problem: ProblemReport,
  answer: (body: { when?: string }) => Partial<MatchResult> = () => ({}),
) {
  localStorage.setItem('karigor.token', 'saved-token');
  return mockApi({
    'GET /auth/me': () => ({ body: { data: { user: testUsers.customer } } }),
    'GET /problems/r1': () => ({ body: { data: { report: problem } } }),
    'POST /problems/r1/matches': (body) => {
      const sent = body as { when?: string };
      return {
        body: {
          data: {
            serviceId: 'plumber',
            serviceName: 'Plumber',
            emergency: !sent.when,
            when: sent.when ? new Date(sent.when).toISOString() : new Date().toISOString(),
            searchedKm: sent.when ? 10 : 5,
            matches: threeMatches,
            ...answer(sent),
          },
        },
      };
    },
  });
}

const sentBody = (fetchMock: ReturnType<typeof mockApi>) => {
  const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/matches'));
  return call ? JSON.parse(call[1]!.body as string) : undefined;
};

// the area list arrives a moment after the page
async function chooseMirpur(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('option', { name: 'Mirpur' }, { timeout: 5000 });
  await user.selectOptions(screen.getByLabelText('Your area'), 'Mirpur');
}

async function pinAndPickTomorrow(user: ReturnType<typeof userEvent.setup>) {
  await chooseMirpur(user);
  await user.click(screen.getByRole('button', { name: /^Tomorrow/ }));
  await user.click(screen.getByRole('button', { name: '10:00 AM' }));
}

describe('where and when, and the top 3', () => {
  it('finds the best karigors for the pin and time', async () => {
    const fetchMock = openResult(report);
    const user = userEvent.setup();
    renderAt('/request/r1');

    await pinAndPickTomorrow(user);
    expect(screen.getByText(/Pin is near/)).toHaveTextContent('Pin is near Mirpur');
    await user.click(screen.getByRole('button', { name: 'Show the best karigors' }));

    expect(
      await screen.findByRole('heading', { name: 'The 3 best karigors for you' }),
    ).toBeInTheDocument();
    expect(sentBody(fetchMock)).toEqual({
      location: { lat: 23.8223, lng: 90.3654 },
      when: `${nextDays(new Date())[1]}T10:00:00+06:00`,
    });
    expect(screen.getByText(/Plumber · Tomorrow, .* at 10:00 AM · within 10 km/)).toBeVisible();
    expect(screen.getByText(/Step 3 of 3/)).toBeInTheDocument();
  });

  it('shows the facts on each card, with the first as best match', async () => {
    openResult(report);
    const user = userEvent.setup();
    renderAt('/request/r1');

    await pinAndPickTomorrow(user);
    await user.click(screen.getByRole('button', { name: 'Show the best karigors' }));

    const rahim = await screen.findByRole('article', { name: 'Rahim Uddin' });
    expect(within(rahim).getByText('Best match')).toBeInTheDocument();
    expect(within(rahim).getByText('Mirpur · 0.4 km away')).toBeInTheDocument();
    expect(within(rahim).getByText('Has the skill: Tap and faucet repair')).toBeInTheDocument();
    expect(within(rahim).getByText('8 yrs')).toBeInTheDocument();

    const kamal = screen.getByRole('article', { name: 'Kamal Hossain' });
    expect(within(kamal).queryByText('Best match')).toBeNull();
    expect(within(kamal).getByText('New')).toBeInTheDocument();
    expect(within(kamal).getByText(/no reviews yet/)).toBeInTheDocument();
    expect(within(kamal).getByText('Under 1 yr')).toBeInTheDocument();

    const abdul = screen.getByRole('article', { name: 'Abdul Karim' });
    expect(within(abdul).queryByText(/Has the skill/)).toBeNull();
    expect(within(abdul).getByRole('button', { name: 'Book Abdul' })).toBeInTheDocument();
  });

  it('asks for a pin and a time first', async () => {
    const fetchMock = openResult(report);
    const user = userEvent.setup();
    renderAt('/request/r1');

    await user.click(await screen.findByRole('button', { name: 'Show the best karigors' }));

    expect(screen.getByText(/Pin your home first/)).toBeInTheDocument();
    expect(screen.getByText('Pick a day and a time.')).toBeInTheDocument();
    expect(sentBody(fetchMock)).toBeUndefined();
  });

  it('opens the booking pop-up with a summary', async () => {
    openResult(report);
    const user = userEvent.setup();
    renderAt('/request/r1');

    await pinAndPickTomorrow(user);
    await user.click(screen.getByRole('button', { name: 'Show the best karigors' }));
    await user.click(await screen.findByRole('button', { name: 'Book Rahim' }));

    const dialog = screen.getByRole('dialog', { name: 'Book Rahim Uddin?' });
    expect(within(dialog).getByText('Plumber')).toBeInTheDocument();
    expect(within(dialog).getByText(/Tomorrow, .* at 10:00 AM/)).toBeInTheDocument();
    expect(within(dialog).getByText('Your pin near Mirpur')).toBeInTheDocument();
    expect(within(dialog).getByText('৳400 – ৳800 + parts')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('House, road and flat')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Send booking request' })).toBeDisabled();
  });

  it('says so when nobody is free, and helps pick another time', async () => {
    openResult(report, () => ({ matches: [] }));
    const user = userEvent.setup();
    renderAt('/request/r1');

    await pinAndPickTomorrow(user);
    await user.click(screen.getByRole('button', { name: 'Show the best karigors' }));

    expect(await screen.findByRole('heading', { name: 'Nobody is free then' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Pick another time' }));
    expect(screen.getByRole('button', { name: /^Today/ })).toHaveFocus();
    expect(screen.getByText(/Step 2 of 3/)).toBeInTheDocument();
  });

  it('clears the old results when the time changes', async () => {
    openResult(report);
    const user = userEvent.setup();
    renderAt('/request/r1');

    await pinAndPickTomorrow(user);
    await user.click(screen.getByRole('button', { name: 'Show the best karigors' }));
    await screen.findByRole('heading', { name: 'The 3 best karigors for you' });

    await user.click(screen.getByRole('button', { name: '11:00 AM' }));

    expect(screen.queryByRole('heading', { name: 'The 3 best karigors for you' })).toBeNull();
    expect(screen.getByText(/Step 2 of 3/)).toBeInTheDocument();
  });
});

describe('emergencies', () => {
  it('looks for people free right now, without asking for a time', async () => {
    const fetchMock = openResult(emergencyReport, () => ({
      matches: [match('Nazrul Islam', { bestMatch: true })],
    }));
    const user = userEvent.setup();
    renderAt('/request/r1');

    await chooseMirpur(user);
    expect(screen.queryByRole('group', { name: 'Day' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Find karigors free right now' }));

    expect(await screen.findByRole('heading', { name: 'The best karigor for you' })).toBeVisible();
    expect(screen.getByText('Plumber · Right now · within 5 km')).toBeVisible();
    expect(sentBody(fetchMock)).toEqual({ location: { lat: 23.8223, lng: 90.3654 } });
  });

  it('can book for later when nobody is free right now', async () => {
    const fetchMock = openResult(emergencyReport, (body) => (body.when ? {} : { matches: [] }));
    const user = userEvent.setup();
    renderAt('/request/r1');

    await chooseMirpur(user);
    await user.click(screen.getByRole('button', { name: 'Find karigors free right now' }));
    expect(await screen.findByRole('heading', { name: 'Nobody is free right now' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Book for later' }));
    await user.click(screen.getByRole('button', { name: /^Tomorrow/ }));
    await user.click(screen.getByRole('button', { name: '10:00 AM' }));
    await user.click(screen.getByRole('button', { name: 'Show the best karigors' }));

    expect(
      await screen.findByRole('heading', { name: 'The 3 best karigors for you' }),
    ).toBeVisible();
    const calls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/matches'));
    expect(JSON.parse(calls[1]![1]!.body as string).when).toMatch(/T10:00:00\+06:00$/);
  });
});
