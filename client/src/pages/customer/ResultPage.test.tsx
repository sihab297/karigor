import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockApi, renderAt, testUsers } from '../../test/helpers';
import type { Analysis, ProblemReport } from './problem-types';

function analysis(extra: Partial<Analysis> = {}): Analysis {
  return {
    understood: true,
    serviceId: 'plumber',
    serviceName: 'Plumber',
    skillIds: ['tap-repair'],
    summary: 'The kitchen taps are leaking.',
    urgency: 'normal',
    confidence: 'high',
    emergencyType: null,
    safetyTips: [],
    emergencyNumber: null,
    priceLines: [
      {
        priceItemId: 'plumber-tap',
        name: 'Tap repair or replacement',
        unit: 'per tap',
        quantity: 2,
        minPrice: 400,
        maxPrice: 800,
      },
    ],
    estimate: { min: 400, max: 800 },
    matchesChosenService: true,
    followUpQuestion: null,
    model: 'mock',
    latencyMs: 5,
    ...extra,
  };
}

function makeReport(extra: Partial<ProblemReport> = {}): ProblemReport {
  return {
    id: 'r1',
    mode: 'describe',
    text: 'rannaghorer kol theke pani porche',
    photoUrls: [],
    ai: analysis(),
    createdAt: '2026-10-14T08:00:00.000Z',
    ...extra,
  };
}

const notUnderstood = analysis({
  understood: false,
  serviceId: null,
  serviceName: null,
  skillIds: [],
  summary: 'Something needs fixing.',
  confidence: 'low',
  priceLines: [],
  estimate: null,
  followUpQuestion: 'What is not working? For example a tap or a fan.',
});

function openResult(report: ProblemReport, routes: Parameters<typeof mockApi>[0] = {}) {
  localStorage.setItem('karigor.token', 'saved-token');
  const fetchMock = mockApi({
    'GET /auth/me': () => ({ body: { data: { user: testUsers.customer } } }),
    'GET /problems/r1': () => ({ body: { data: { report } } }),
    'PATCH /problems/r1': (body) => ({
      body: { data: { report: { ...report, ...(body as object) } } },
    }),
    ...routes,
  });
  renderAt('/request/r1');
  return fetchMock;
}

const patchedWith = (fetchMock: ReturnType<typeof mockApi>) => {
  const call = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
  return call ? JSON.parse(call[1]!.body as string) : undefined;
};

describe('result page', () => {
  it('shows the service, how sure we are and the rough price', async () => {
    openResult(makeReport({ photoUrls: ['https://res.cloudinary.com/demo/photo-1.jpg'] }));

    expect(await screen.findByRole('heading', { name: 'Plumber' })).toBeInTheDocument();
    expect(screen.getByText('Not urgent')).toBeInTheDocument();
    expect(screen.getByText("We're sure")).toBeInTheDocument();
    expect(screen.getByText('The kitchen taps are leaking.')).toBeInTheDocument();
    expect(screen.getByText('Tap repair or replacement × 2')).toBeInTheDocument();
    expect(screen.getAllByText('৳400 – ৳800')).toHaveLength(2);
    expect(screen.getByText(/Parts are extra/)).toBeInTheDocument();
    expect(screen.getByText('rannaghorer kol theke pani porche')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Your photo 1' })).toHaveAttribute(
      'src',
      'https://res.cloudinary.com/demo/photo-1.jpg',
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('puts safety steps and 999 first in an emergency', async () => {
    openResult(
      makeReport({
        ai: analysis({
          serviceId: 'electrician',
          urgency: 'emergency',
          emergencyType: 'electric-spark',
          safetyTips: ['Switch off the main switch if you can reach it safely.'],
          emergencyNumber: '999',
        }),
      }),
    );

    const box = await screen.findByRole('alert');
    expect(box).toHaveTextContent('Switch off the main switch if you can reach it safely.');
    expect(within(box).getByRole('link', { name: 'Call 999' })).toHaveAttribute('href', 'tel:999');
    expect(screen.getByText('Emergency')).toBeInTheDocument();
  });

  it('asks a question when the AI is not sure, and sends their words back', async () => {
    openResult(
      makeReport({
        ai: analysis({ confidence: 'low', followUpQuestion: 'Is it the tap or the pipe?' }),
      }),
    );
    const user = userEvent.setup();

    expect(await screen.findByText("We're not sure")).toBeInTheDocument();
    expect(screen.getByText('Is it the tap or the pipe?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add details' }));

    expect(await screen.findByLabelText("What's wrong?")).toHaveValue(
      'rannaghorer kol theke pani porche',
    );
  });

  it('sends quick path customers back to their service', async () => {
    openResult(
      makeReport({
        mode: 'quick',
        chosenServiceId: 'plumber',
        text: 'basin',
        ai: analysis({ confidence: 'low', followUpQuestion: 'Is it leaking or blocked?' }),
      }),
    );
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Add details' }));

    expect(await screen.findByRole('tab', { name: /I know the service/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(await screen.findByLabelText('What needs doing?')).toHaveValue('basin');
  });

  it('lets them choose the service when the AI could not tell', async () => {
    const fetchMock = openResult(makeReport({ ai: notUnderstood }));
    const user = userEvent.setup();

    expect(
      await screen.findByRole('heading', { name: "We couldn't tell what's wrong yet" }),
    ).toBeInTheDocument();
    expect(screen.getByText('What is not working? For example a tap or a fan.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Use this service' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /Plumber/ }));
    await user.click(screen.getByRole('button', { name: 'Use this service' }));

    expect(await screen.findByRole('heading', { name: 'Plumber' })).toBeInTheDocument();
    expect(patchedWith(fetchMock)).toEqual({ finalServiceId: 'plumber' });
    expect(screen.getByText('You chose this yourself.')).toBeInTheDocument();
    expect(screen.getByText('The karigor tells you the price after checking.')).toBeVisible();
  });

  it('explains when the AI is down', async () => {
    openResult(makeReport({ ai: null, aiError: 'AI_FAILED' }));

    expect(
      await screen.findByRole('heading', { name: "We couldn't check your problem right now" }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Which service do you need?' })).toBeVisible();
  });

  it('keeps the quick path choice when the AI is down', async () => {
    openResult(
      makeReport({ mode: 'quick', chosenServiceId: 'electrician', ai: null, aiError: 'AI_FAILED' }),
    );

    expect(await screen.findByRole('heading', { name: 'Electrician' })).toBeInTheDocument();
    expect(screen.getByText('You chose this yourself.')).toBeInTheDocument();
  });

  it('lets quick path customers keep their own service', async () => {
    const fetchMock = openResult(
      makeReport({
        mode: 'quick',
        chosenServiceId: 'plumber',
        ai: analysis({ serviceId: 'electrician', matchesChosenService: false }),
      }),
    );
    const user = userEvent.setup();

    expect(
      await screen.findByRole('heading', {
        name: 'You chose Plumber, but this sounds like Electrician.',
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Keep Plumber' }));

    expect(await screen.findByRole('heading', { name: 'Plumber' })).toBeInTheDocument();
    expect(patchedWith(fetchMock)).toEqual({ finalServiceId: 'plumber' });
    expect(screen.queryByText(/but this sounds like/)).toBeNull();
    expect(
      screen.getByText('You chose this yourself. Our AI suggested Electrician.'),
    ).toBeVisible();
  });

  it('changes the service from the pop-up', async () => {
    const fetchMock = openResult(makeReport());
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Change service' }));
    const dialog = screen.getByRole('dialog', { name: 'Which service do you need?' });
    expect(within(dialog).getByRole('button', { name: 'Use this service' })).toBeDisabled();

    await user.click(within(dialog).getByRole('button', { name: /Painter/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Use this service' }));

    expect(await screen.findByRole('heading', { name: 'Painter' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(patchedWith(fetchMock)).toEqual({ finalServiceId: 'painter' });
    expect(screen.queryByText('৳400 – ৳800')).toBeNull();
  });

  it('shows why a change did not save', async () => {
    openResult(makeReport(), {
      'PATCH /problems/r1': () => ({
        status: 400,
        body: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Please check the highlighted fields.',
            details: [{ field: 'finalServiceId', message: "We don't offer this service" }],
          },
        },
      }),
    });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Change service' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /Cleaner/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Use this service' }));

    expect(await within(dialog).findByText("We don't offer this service")).toBeInTheDocument();
  });

  it('says so when the problem is not theirs or does not exist', async () => {
    openResult(makeReport(), {
      'GET /problems/r1': () => ({
        status: 404,
        body: { error: { code: 'PROBLEM_NOT_FOUND', message: "We couldn't find this problem." } },
      }),
    });

    expect(
      await screen.findByRole('heading', { name: "We couldn't find this problem" }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tell us about a new problem' })).toHaveAttribute(
      'href',
      '/request',
    );
  });
});
