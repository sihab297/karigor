import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockApi, renderAt, testUsers } from '../../test/helpers';

const savedProfile = {
  id: 'p1',
  serviceIds: ['electrician'],
  skillIds: ['fan'],
  areaName: 'Mirpur',
  location: { type: 'Point', coordinates: [90.3654, 23.8223] },
  serviceRadiusKm: 10,
  workingDays: [0, 1, 2, 3, 4, 6],
  workingHours: { start: '09:00', end: '20:00' },
  experienceYears: 5,
  acceptingJobs: true,
  approvalStatus: 'pending',
  hasNidPhoto: false,
};

function asTechnician(routes: Parameters<typeof mockApi>[0] = {}) {
  localStorage.setItem('karigor.token', 'saved-token');
  return mockApi({
    'GET /auth/me': () => ({ body: { data: { user: testUsers.technician } } }),
    ...routes,
  });
}

const sentBody = (fetchMock: ReturnType<typeof mockApi>, method: string, path: string) => {
  const call = fetchMock.mock.calls.find(
    ([url, init]) => String(url).endsWith(path) && init?.method === method,
  );
  return call?.[1]?.body;
};

describe('new technician', () => {
  it('asks them to fill in the profile', async () => {
    asTechnician();
    renderAt('/tech/profile');

    expect(await screen.findByText(/so customers can find you/)).toBeInTheDocument();
    expect(screen.getByTestId('map')).toHaveTextContent('no pin');
  });

  it('fills in and saves the whole profile', async () => {
    const fetchMock = asTechnician({
      'PUT /technicians/me/profile': () => ({ body: { data: { profile: savedProfile } } }),
    });
    const user = userEvent.setup();
    renderAt('/tech/profile');
    await screen.findByRole('heading', { name: 'What do you do?' });

    await user.click(screen.getByRole('button', { name: 'Electrician' }));
    await user.click(screen.getByRole('button', { name: 'Ceiling fan repair and fitting' }));
    await user.selectOptions(screen.getByLabelText('Area'), 'Mirpur');
    await user.selectOptions(screen.getByLabelText('How far will you travel?'), '15');
    await user.click(screen.getByRole('button', { name: 'Friday' }));
    await user.click(screen.getByRole('button', { name: 'Saturday' }));
    await user.selectOptions(screen.getByLabelText('From'), '10:00');
    await user.type(screen.getByLabelText('Years of experience'), '5');
    await user.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(await screen.findByText('Waiting for approval')).toBeInTheDocument();
    expect(JSON.parse(sentBody(fetchMock, 'PUT', '/technicians/me/profile') as string)).toEqual({
      serviceIds: ['electrician'],
      skillIds: ['fan'],
      areaName: 'Mirpur',
      location: { lat: 23.8223, lng: 90.3654 },
      serviceRadiusKm: 15,
      workingDays: [0, 1, 2, 3, 4, 5],
      workingHours: { start: '10:00', end: '20:00' },
      experienceYears: 5,
    });
    expect(screen.getAllByText('Profile saved.').length).toBeGreaterThan(0);
  });

  it('moves the pin to the chosen area', async () => {
    asTechnician();
    const user = userEvent.setup();
    renderAt('/tech/profile');

    await user.selectOptions(await screen.findByLabelText('Area'), 'Dhanmondi');

    expect(screen.getByTestId('map')).toHaveTextContent('pin 23.7461,90.3742');
  });

  it('allows at most 3 services', async () => {
    asTechnician();
    const user = userEvent.setup();
    renderAt('/tech/profile');
    await screen.findByRole('heading', { name: 'What do you do?' });

    for (const name of ['Electrician', 'Plumber', 'Painter']) {
      await user.click(screen.getByRole('button', { name }));
    }

    expect(screen.getByRole('button', { name: 'Cleaner' })).toBeDisabled();
    expect(screen.getByText('You can choose up to 3 services.')).toBeInTheDocument();
  });

  it("forgets a service's skills when the service is removed", async () => {
    const fetchMock = asTechnician({
      'PUT /technicians/me/profile': () => ({ body: { data: { profile: savedProfile } } }),
    });
    const user = userEvent.setup();
    renderAt('/tech/profile');
    await screen.findByRole('heading', { name: 'What do you do?' });

    await user.click(screen.getByRole('button', { name: 'Plumber' }));
    await user.click(screen.getByRole('button', { name: 'Tap and faucet repair' }));
    await user.click(screen.getByRole('button', { name: 'Plumber' }));
    await user.click(screen.getByRole('button', { name: 'Save profile' }));

    await waitFor(() =>
      expect(sentBody(fetchMock, 'PUT', '/technicians/me/profile')).toBeDefined(),
    );
    const body = JSON.parse(sentBody(fetchMock, 'PUT', '/technicians/me/profile') as string);
    expect(body.serviceIds).toEqual([]);
    expect(body.skillIds).toEqual([]);
  });

  it('shows server errors in the right section', async () => {
    asTechnician({
      'PUT /technicians/me/profile': () => ({
        status: 400,
        body: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Please check the highlighted fields.',
            details: [
              { field: 'skillIds', message: 'Choose at least one skill for Electrician' },
              { field: 'location', message: 'Pick your location on the map' },
            ],
          },
        },
      }),
    });
    const user = userEvent.setup();
    renderAt('/tech/profile');
    await screen.findByRole('heading', { name: 'What do you do?' });

    await user.click(screen.getByRole('button', { name: 'Save profile' }));

    const step1 = screen.getByRole('region', { name: 'What do you do?' });
    const step2 = screen.getByRole('region', { name: 'Where do you work?' });
    expect(
      await within(step1).findByText('Choose at least one skill for Electrician'),
    ).toBeInTheDocument();
    expect(within(step2).getByText('Pick your location on the map')).toBeInTheDocument();
    expect(screen.getAllByText(/Some details need fixing/).length).toBeGreaterThan(0);
  });
});

describe('NID photo', () => {
  it('uploads the photo after saving the details', async () => {
    let uploaded: FormData | undefined;
    asTechnician({
      'GET /technicians/me/profile': () => ({ body: { data: { profile: savedProfile } } }),
      'PUT /technicians/me/profile': () => ({ body: { data: { profile: savedProfile } } }),
      'POST /technicians/me/nid': (body) => {
        uploaded = body as FormData;
        return { body: { data: { profile: { ...savedProfile, hasNidPhoto: true } } } };
      },
    });
    const user = userEvent.setup();
    renderAt('/tech/profile');

    const photo = new File(['fake'], 'nid-front.jpg', { type: 'image/jpeg' });
    await user.upload(await screen.findByLabelText('NID photo'), photo);
    expect(screen.getByText('nid-front.jpg')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(await screen.findByText('NID photo uploaded')).toBeInTheDocument();
    expect((uploaded!.get('photo') as File).name).toBe('nid-front.jpg');
  });

  it('refuses big files before uploading', async () => {
    asTechnician({
      'GET /technicians/me/profile': () => ({ body: { data: { profile: savedProfile } } }),
    });
    const user = userEvent.setup();
    renderAt('/tech/profile');

    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.jpg', { type: 'image/jpeg' });
    await user.upload(await screen.findByLabelText('NID photo'), big);

    expect(screen.getByText('The photo must be 5 MB or smaller.')).toBeInTheDocument();
    expect(screen.queryByText('big.jpg')).not.toBeInTheDocument();
  });
});

describe('existing technician', () => {
  it('loads their saved details', async () => {
    asTechnician({
      'GET /technicians/me/profile': () => ({ body: { data: { profile: savedProfile } } }),
    });
    renderAt('/tech/profile');

    expect(await screen.findByRole('button', { name: 'Electrician' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Ceiling fan repair and fitting' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByLabelText('Area')).toHaveValue('Mirpur');
    expect(screen.getByLabelText('Years of experience')).toHaveValue(5);
    expect(screen.getByTestId('map')).toHaveTextContent('pin 23.8223,90.3654');
    expect(screen.getByText(/Add your NID photo below/)).toBeInTheDocument();
  });

  it('lets an approved technician stop taking jobs', async () => {
    const approved = { ...savedProfile, approvalStatus: 'approved', hasNidPhoto: true };
    const fetchMock = asTechnician({
      'GET /technicians/me/profile': () => ({ body: { data: { profile: approved } } }),
      'PATCH /technicians/me/availability': () => ({
        body: { data: { profile: { ...approved, acceptingJobs: false } } },
      }),
    });
    const user = userEvent.setup();
    renderAt('/tech/profile');

    const toggle = await screen.findByRole('switch', { name: 'Taking jobs' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    await user.click(toggle);

    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'false'));
    expect(screen.getByText(/You're not taking jobs right now/)).toBeInTheDocument();
    expect(
      JSON.parse(sentBody(fetchMock, 'PATCH', '/technicians/me/availability') as string),
    ).toEqual({
      acceptingJobs: false,
    });
  });

  it('shows why a profile was rejected', async () => {
    const rejected = {
      ...savedProfile,
      approvalStatus: 'rejected',
      rejectionReason: 'The NID photo is blurry.',
    };
    asTechnician({
      'GET /technicians/me/profile': () => ({ body: { data: { profile: rejected } } }),
    });
    renderAt('/tech/profile');

    expect(await screen.findByRole('alert')).toHaveTextContent('The NID photo is blurry.');
  });

  it('offers to try again if loading fails', async () => {
    asTechnician({
      'GET /areas': () => ({
        status: 500,
        body: { error: { code: 'SERVER_ERROR', message: 'Something went wrong.' } },
      }),
    });
    renderAt('/tech/profile');

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
