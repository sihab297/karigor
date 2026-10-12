import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockApi, renderAt, testUsers } from '../../test/helpers';

function technician(name: string, phone: string, extra: object = {}) {
  return {
    id: `p-${phone}`,
    userId: `u-${phone}`,
    serviceIds: ['plumber'],
    skillIds: ['tap-repair'],
    areaName: 'Lalbagh',
    location: { type: 'Point', coordinates: [90.3882, 23.7189] },
    serviceRadiusKm: 10,
    workingDays: [0, 1, 2, 3, 4, 6],
    workingHours: { start: '09:00', end: '20:00' },
    experienceYears: 3,
    acceptingJobs: true,
    approvalStatus: 'pending',
    hasNidPhoto: true,
    updatedAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    user: { id: `u-${phone}`, name, phone, status: 'active', joinedAt: '2026-10-01T00:00:00Z' },
    ...extra,
  };
}

const sohel = technician('Sohel Rana', '01700000018');
const arif = technician('Arif Hasan', '01700000019', {
  serviceIds: ['electrician'],
  skillIds: ['fan'],
  areaName: 'Wari',
  hasNidPhoto: false,
});
const counts = { pending: 2, approved: 17, rejected: 0 };

function asAdmin(routes: Parameters<typeof mockApi>[0] = {}) {
  localStorage.setItem('karigor.token', 'saved-token');
  return mockApi({
    'GET /auth/me': () => ({ body: { data: { user: testUsers.admin } } }),
    'GET /admin/technicians?status=pending': () => ({
      body: { data: { technicians: [sohel, arif], counts } },
    }),
    ...routes,
  });
}

const card = (name: string) => screen.getByRole('article', { name });

describe('waiting technicians', () => {
  it('lists them with the details the admin needs', async () => {
    asAdmin();
    renderAt('/admin/technicians');

    const sohelCard = await screen.findByRole('article', { name: 'Sohel Rana' });
    expect(within(sohelCard).getByText('01700000018 · Plumber · Lalbagh')).toBeInTheDocument();
    expect(within(sohelCard).getByText('Sent 2 days ago')).toBeInTheDocument();
    expect(within(sohelCard).getByText('Sat to Thu, 9:00 AM to 8:00 PM')).toBeInTheDocument();
    expect(within(sohelCard).getByText('Tap and faucet repair')).toBeInTheDocument();
    expect(within(sohelCard).getByText('3 years')).toBeInTheDocument();

    const tabs = screen.getAllByRole('tab').map((t) => t.textContent);
    expect(tabs).toEqual(['Waiting2', 'Approved17', 'Rejected0']);
  });

  it('only lets the admin approve technicians with an NID photo', async () => {
    asAdmin();
    renderAt('/admin/technicians');
    await screen.findByRole('article', { name: 'Arif Hasan' });

    expect(within(card('Arif Hasan')).getByRole('button', { name: 'Approve' })).toBeDisabled();
    expect(within(card('Arif Hasan')).getByText('No NID photo yet')).toBeInTheDocument();
    expect(within(card('Sohel Rana')).getByRole('button', { name: 'Approve' })).toBeEnabled();
  });

  it('approves, removes the card and updates the counts', async () => {
    const fetchMock = asAdmin({
      'PATCH /admin/technicians/u-01700000018/approval': () => ({
        body: { data: { technician: { ...sohel, approvalStatus: 'approved' } } },
      }),
    });
    const user = userEvent.setup();
    renderAt('/admin/technicians');

    await user.click(
      within(await screen.findByRole('article', { name: 'Sohel Rana' })).getByRole('button', {
        name: 'Approve',
      }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Sohel Rana is approved. Customers can now book them.',
    );
    expect(screen.queryByRole('article', { name: 'Sohel Rana' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Waiting1',
      'Approved18',
      'Rejected0',
    ]);
    const call = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(JSON.parse(call![1]!.body as string)).toEqual({ status: 'approved' });
  });

  it('rejects with a quick reason the admin can edit', async () => {
    const fetchMock = asAdmin({
      'PATCH /admin/technicians/u-01700000019/approval': () => ({
        body: { data: { technician: { ...arif, approvalStatus: 'rejected' } } },
      }),
    });
    const user = userEvent.setup();
    renderAt('/admin/technicians');
    await screen.findByRole('article', { name: 'Arif Hasan' });

    await user.click(within(card('Arif Hasan')).getByRole('button', { name: 'Reject' }));
    await user.click(
      within(card('Arif Hasan')).getByRole('button', { name: 'NID photo is missing' }),
    );
    const box = within(card('Arif Hasan')).getByLabelText(/Why are you rejecting/);
    expect(box).toHaveValue('NID photo is missing. Please fix it and save your profile again.');
    await user.click(within(card('Arif Hasan')).getByRole('button', { name: 'Reject Arif' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      "Arif Hasan is rejected. They'll see your reason.",
    );
    const call = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(JSON.parse(call![1]!.body as string)).toEqual({
      status: 'rejected',
      reason: 'NID photo is missing. Please fix it and save your profile again.',
    });
  });

  it('asks for a reason before rejecting', async () => {
    const fetchMock = asAdmin();
    const user = userEvent.setup();
    renderAt('/admin/technicians');
    await screen.findByRole('article', { name: 'Arif Hasan' });

    await user.click(within(card('Arif Hasan')).getByRole('button', { name: 'Reject' }));
    await user.click(within(card('Arif Hasan')).getByRole('button', { name: 'Reject Arif' }));

    expect(
      within(card('Arif Hasan')).getByText('Tell the technician why, in a few words.'),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false);
  });

  it('shows a server problem on the card', async () => {
    asAdmin({
      'PATCH /admin/technicians/u-01700000018/approval': () => ({
        status: 409,
        body: {
          error: {
            code: 'NID_REQUIRED',
            message: 'You can approve only after the technician uploads their NID photo.',
          },
        },
      }),
    });
    const user = userEvent.setup();
    renderAt('/admin/technicians');

    await user.click(
      within(await screen.findByRole('article', { name: 'Sohel Rana' })).getByRole('button', {
        name: 'Approve',
      }),
    );

    expect(await within(card('Sohel Rana')).findByRole('alert')).toHaveTextContent(
      'uploads their NID photo',
    );
  });
});

describe('NID photo pop-up', () => {
  it('opens the photo and approves from the pop-up', async () => {
    asAdmin({
      'GET /admin/technicians/u-01700000018/nid': () => ({
        body: {
          data: { url: 'https://api.cloudinary.com/nid?sig=1', expiresAt: '2026-10-12T10:05:00Z' },
        },
      }),
      'PATCH /admin/technicians/u-01700000018/approval': () => ({
        body: { data: { technician: { ...sohel, approvalStatus: 'approved' } } },
      }),
    });
    const user = userEvent.setup();
    renderAt('/admin/technicians');

    await user.click(
      within(await screen.findByRole('article', { name: 'Sohel Rana' })).getByRole('button', {
        name: 'View NID photo',
      }),
    );

    const dialog = screen.getByRole('dialog', { name: "Sohel Rana's NID" });
    expect(
      await within(dialog).findByRole('img', { name: 'NID photo of Sohel Rana' }),
    ).toHaveAttribute('src', 'https://api.cloudinary.com/nid?sig=1');
    expect(within(dialog).getByText(/opens for 5 minutes only/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Approve Sohel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('status')).toHaveTextContent('Sohel Rana is approved');
  });

  it('closes with Escape and goes back to the button', async () => {
    asAdmin({
      'GET /admin/technicians/u-01700000018/nid': () => ({
        body: { data: { url: 'https://x/nid', expiresAt: '' } },
      }),
    });
    const user = userEvent.setup();
    renderAt('/admin/technicians');

    const viewButton = within(await screen.findByRole('article', { name: 'Sohel Rana' })).getByRole(
      'button',
      { name: 'View NID photo' },
    );
    await user.click(viewButton);
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(viewButton).toHaveFocus();
  });

  it('can start rejecting from the pop-up', async () => {
    asAdmin({
      'GET /admin/technicians/u-01700000018/nid': () => ({
        body: { data: { url: 'https://x/nid', expiresAt: '' } },
      }),
    });
    const user = userEvent.setup();
    renderAt('/admin/technicians');

    await user.click(
      within(await screen.findByRole('article', { name: 'Sohel Rana' })).getByRole('button', {
        name: 'View NID photo',
      }),
    );
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reject' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(within(card('Sohel Rana')).getByLabelText(/Why are you rejecting/)).toBeInTheDocument();
  });
});

describe('other tabs', () => {
  it('shows rejected technicians with the reason that was sent', async () => {
    const rejected = technician('Kamal Hossain', '01700000009', {
      approvalStatus: 'rejected',
      rejectionReason: 'NID photo is blurry.',
      reviewedAt: new Date().toISOString(),
    });
    asAdmin({
      'GET /admin/technicians?status=rejected': () => ({
        body: { data: { technicians: [rejected], counts: { ...counts, rejected: 1 } } },
      }),
    });
    const user = userEvent.setup();
    renderAt('/admin/technicians');

    await user.click(await screen.findByRole('tab', { name: /Rejected/ }));

    const kamal = await screen.findByRole('article', { name: 'Kamal Hossain' });
    expect(within(kamal).getByText(/NID photo is blurry/)).toBeInTheDocument();
    expect(within(kamal).getByText('Rejected today')).toBeInTheDocument();
    expect(within(kamal).queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Rejected/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('says when a tab is empty', async () => {
    asAdmin({
      'GET /admin/technicians?status=pending': () => ({
        body: { data: { technicians: [], counts: { pending: 0, approved: 17, rejected: 0 } } },
      }),
    });
    renderAt('/admin/technicians');

    expect(await screen.findByText(/No technicians waiting/)).toBeInTheDocument();
  });
});
