import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockApi, renderAt, testUsers } from '../../test/helpers';

const report = { id: 'r1', mode: 'describe', text: 'fan ghurche na', photoUrls: [], ai: null };

function asCustomer(routes: Parameters<typeof mockApi>[0] = {}) {
  localStorage.setItem('karigor.token', 'saved-token');
  return mockApi({
    'GET /auth/me': () => ({ body: { data: { user: testUsers.customer } } }),
    'POST /problems/analyze': () => ({ status: 201, body: { data: { report } } }),
    'GET /services/electrician/quick-picks': () => ({
      body: {
        data: {
          quickPicks: [
            { priceItemId: 'elec-fan', label: 'Fan not working' },
            { priceItemId: 'elec-ips', label: 'IPS not working' },
          ],
        },
      },
    }),
    ...routes,
  });
}

const sentForm = (fetchMock: ReturnType<typeof mockApi>) => {
  const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/problems/analyze'));
  return call?.[1]?.body as FormData | undefined;
};

const photo = (name: string, bytes = 1000) => {
  const file = new File(['x'], name, { type: 'image/jpeg' });
  Object.defineProperty(file, 'size', { value: bytes });
  return file;
};

const findButton = () => screen.findByRole('button', { name: 'Find the right karigor' });

describe('describe it', () => {
  it('sends a written problem and opens the result', async () => {
    const fetchMock = asCustomer();
    const user = userEvent.setup();
    renderAt('/request');

    await user.type(await screen.findByLabelText("What's wrong?"), 'fan ghurche na');
    await user.click(await findButton());

    expect(await screen.findByRole('heading', { name: 'Your result' })).toBeInTheDocument();
    const form = sentForm(fetchMock)!;
    expect(form.get('text')).toBe('fan ghurche na');
    expect(form.has('chosenServiceId')).toBe(false);
  });

  it('shows what is happening while the AI checks', async () => {
    const fetchMock = asCustomer();
    const send = fetchMock.getMockImplementation()!;
    let finish = () => {};
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') await new Promise<void>((done) => (finish = done));
      return send(url, init);
    });
    const user = userEvent.setup();
    renderAt('/request');

    await user.type(await screen.findByLabelText("What's wrong?"), 'pipe leak in the kitchen');
    await user.click(await findButton());

    expect(await screen.findByRole('heading', { name: 'Checking your problem…' })).toHaveFocus();
    expect(screen.getByText('pipe leak in the kitchen')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Find the right karigor' })).toBeNull();

    finish();
    expect(await screen.findByRole('heading', { name: 'Your result' })).toBeInTheDocument();
  });

  it('asks for words or a photo before sending', async () => {
    const fetchMock = asCustomer();
    const user = userEvent.setup();
    renderAt('/request');

    await user.click(await findButton());

    expect(screen.getByText('Tell us the problem or add a photo')).toBeInTheDocument();
    expect(screen.getByLabelText("What's wrong?")).toHaveAttribute('aria-invalid', 'true');
    expect(sentForm(fetchMock)).toBeUndefined();
  });

  it('fills the box with an example', async () => {
    asCustomer();
    const user = userEvent.setup();
    renderAt('/request');

    await user.click(await screen.findByRole('button', { name: 'AC theke pani porche' }));

    expect(screen.getByLabelText("What's wrong?")).toHaveValue('AC theke pani porche');
  });

  it('adds, removes and sends photos', async () => {
    const fetchMock = asCustomer();
    const user = userEvent.setup();
    renderAt('/request');

    const input = await screen.findByLabelText('Add photos');
    await user.upload(input, [photo('sink.jpg'), photo('pipe.jpg')]);
    expect(screen.getByRole('img', { name: 'Photo 2' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove photo 1' }));
    await user.upload(input, photo('huge.jpg', 6 * 1024 * 1024));
    expect(
      screen.getByText('"huge.jpg" is bigger than 5 MB. Choose a smaller photo.'),
    ).toBeVisible();
    expect(screen.getAllByRole('img', { name: /Photo/ })).toHaveLength(1);

    await user.click(await findButton());

    await screen.findByRole('heading', { name: 'Your result' });
    const sent = sentForm(fetchMock)!.getAll('photos') as File[];
    expect(sent.map((file) => file.name)).toEqual(['pipe.jpg']);
  });

  it('takes at most 3 photos', async () => {
    asCustomer();
    const user = userEvent.setup();
    renderAt('/request');

    await user.upload(await screen.findByLabelText('Add photos'), [
      photo('1.jpg'),
      photo('2.jpg'),
      photo('3.jpg'),
      photo('4.jpg'),
    ]);

    expect(screen.getAllByRole('img', { name: /Photo/ })).toHaveLength(3);
    expect(screen.getByText('You can add up to 3 photos.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add/ })).toBeNull();
  });

  it('explains the hourly limit and keeps what they wrote', async () => {
    const message = 'You have checked 10 problems in the last hour. Please try again in 12 min.';
    asCustomer({
      'POST /problems/analyze': () => ({
        status: 429,
        body: { error: { code: 'TOO_MANY_CHECKS', message } },
      }),
    });
    const user = userEvent.setup();
    renderAt('/request');

    await user.type(await screen.findByLabelText("What's wrong?"), 'pipe leak');
    await user.click(await findButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByLabelText("What's wrong?")).toHaveValue('pipe leak');
  });

  it('shows photo problems from the server next to the photos', async () => {
    asCustomer({
      'POST /problems/analyze': () => ({
        status: 400,
        body: { error: { code: 'WRONG_FILE_TYPE', message: 'Use a JPG or PNG photo.' } },
      }),
    });
    const user = userEvent.setup();
    renderAt('/request');

    await user.upload(await screen.findByLabelText('Add photos'), photo('fake.jpg'));
    await user.click(await findButton());

    expect(await screen.findByText('Use a JPG or PNG photo.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('I know the service', () => {
  it('sends the chosen service and a quick pick', async () => {
    const fetchMock = asCustomer();
    const user = userEvent.setup();
    renderAt('/request');

    await user.click(await screen.findByRole('tab', { name: /I know the service/ }));
    await user.click(await screen.findByRole('button', { name: /Electrician/ }));
    await user.click(await screen.findByRole('button', { name: 'Fan not working' }));

    expect(screen.getByLabelText('What needs doing?')).toHaveValue('Fan not working');
    expect(screen.getByRole('button', { name: 'Fan not working' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.type(screen.getByLabelText('What needs doing?'), ', 2ta');
    await user.click(await findButton());

    await screen.findByRole('heading', { name: 'Your result' });
    const form = sentForm(fetchMock)!;
    expect(form.get('chosenServiceId')).toBe('electrician');
    expect(form.get('text')).toBe('Fan not working, 2ta');
  });

  it('lets them write their own line when there are no quick picks', async () => {
    asCustomer({ 'GET /services/plumber/quick-picks': () => ({ status: 500, body: {} }) });
    const user = userEvent.setup();
    renderAt('/request');

    await user.click(await screen.findByRole('tab', { name: /I know the service/ }));
    await user.click(await screen.findByRole('button', { name: /Plumber/ }));

    expect(await screen.findByText('Write it in one line, in your own words.')).toBeVisible();
    expect(screen.getByLabelText('What needs doing?')).toBeEnabled();
  });

  it('asks which service first', async () => {
    asCustomer();
    const user = userEvent.setup();
    renderAt('/request');

    await user.click(await screen.findByRole('tab', { name: /I know the service/ }));
    await user.click(await findButton());

    expect(screen.getByText('Choose a service')).toBeInTheDocument();
  });

  it('opens with the service from the link', async () => {
    asCustomer();
    renderAt('/request?service=electrician');

    expect(await screen.findByRole('tab', { name: /I know the service/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const services = await screen.findByRole('group', { name: 'Which service?' });
    expect(within(services).getByRole('button', { name: /Electrician/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(await screen.findByRole('button', { name: 'IPS not working' })).toBeInTheDocument();
  });

  it('keeps arrow keys moving between the two tabs', async () => {
    asCustomer();
    const user = userEvent.setup();
    renderAt('/request');

    await user.click(await screen.findByRole('tab', { name: /Describe it/ }));
    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('tab', { name: /I know the service/ })).toHaveFocus();
    expect(await screen.findByRole('group', { name: 'Which service?' })).toBeInTheDocument();
  });
});
