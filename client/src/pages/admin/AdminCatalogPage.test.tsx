import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockApi, renderAt, testUsers } from '../../test/helpers';
import type { AdminCatalog } from './admin-types';

function makeCatalog(): AdminCatalog {
  return {
    services: [
      {
        id: 'plumber',
        name: 'Plumber',
        nameBn: 'প্লাম্বার',
        active: true,
        skills: [{ id: 'tap-repair', name: 'Tap and faucet repair' }],
      },
      {
        id: 'cleaner',
        name: 'Cleaner',
        nameBn: 'ক্লিনার',
        active: false,
        skills: [{ id: 'deep-clean', name: 'Deep cleaning' }],
      },
    ],
    priceItems: [
      {
        id: 'plumber-tap',
        serviceId: 'plumber',
        skillId: 'tap-repair',
        name: 'Tap repair or replacement',
        minPrice: 200,
        maxPrice: 400,
        unit: 'per tap',
        quickPick: 'Tap is leaking',
        position: 0,
        active: true,
      },
    ],
    safetyTips: [
      { id: 'gas-leak', name: 'Gas smell or gas leak', tips: ['Turn off the gas.'], active: true },
    ],
  };
}

function signedInAdmin(routes: Parameters<typeof mockApi>[0]) {
  localStorage.setItem('karigor.token', 'saved-token');
  return mockApi({
    'GET /auth/me': () => ({ body: { data: { user: testUsers.admin } } }),
    ...routes,
  });
}

const sentTo = (fetchMock: ReturnType<typeof mockApi>, method: string, path: string) => {
  const call = fetchMock.mock.calls.find(
    ([url, init]) => init?.method === method && String(url).endsWith(path),
  );
  return call?.[1]?.body ? JSON.parse(call[1].body as string) : call ? null : undefined;
};

describe('Admin catalog', () => {
  it('lists the price items of the chosen service and adds one', async () => {
    let catalog = makeCatalog();
    const fetchMock = signedInAdmin({
      'GET /admin/catalog': () => ({ body: { data: catalog } }),
      'POST /admin/price-items': () => {
        catalog = {
          ...catalog,
          priceItems: [
            ...catalog.priceItems,
            {
              id: 'plumber-pump',
              serviceId: 'plumber',
              skillId: null,
              name: 'Water pump repair',
              minPrice: 600,
              maxPrice: 1200,
              unit: 'per motor',
              position: 1,
              active: true,
            },
          ],
        };
        return { status: 201, body: { data: {} } };
      },
    });
    const user = userEvent.setup();
    renderAt('/admin/catalog');

    const list = await screen.findByRole('list', { name: 'Price list' });
    expect(within(list).getByText('Tap repair or replacement')).toBeInTheDocument();
    expect(within(list).getByText(/৳200 – ৳400 · per tap/)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Cleaner (off)' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add a price item' }));
    const form = screen.getByRole('form', { name: 'Add a price item' });
    await user.type(within(form).getByLabelText('Work'), 'Water pump repair');
    await user.type(within(form).getByLabelText('Lowest (Tk)'), '600');
    await user.type(within(form).getByLabelText('Highest (Tk)'), '1200');
    await user.type(within(form).getByLabelText('Unit'), 'per motor');
    await user.click(within(form).getByRole('button', { name: 'Save' }));

    expect(await within(list).findByText('Water pump repair')).toBeInTheDocument();
    expect(sentTo(fetchMock, 'POST', '/admin/price-items')).toEqual({
      serviceId: 'plumber',
      name: 'Water pump repair',
      skillId: null,
      minPrice: 600,
      maxPrice: 1200,
      unit: 'per motor',
      quickPick: '',
    });
  });

  it('asks before removing a price item', async () => {
    const fetchMock = signedInAdmin({
      'GET /admin/catalog': () => ({ body: { data: makeCatalog() } }),
      'DELETE /admin/price-items/plumber-tap': () => ({ status: 204, body: {} }),
    });
    const user = userEvent.setup();
    renderAt('/admin/catalog');

    await user.click(
      await screen.findByRole('button', { name: 'Remove Tap repair or replacement' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Remove Tap repair or replacement?' });
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }));

    expect(sentTo(fetchMock, 'DELETE', '/admin/price-items/plumber-tap')).toBeNull();
  });

  it('shows why a skill cannot be removed', async () => {
    signedInAdmin({
      'GET /admin/catalog': () => ({ body: { data: makeCatalog() } }),
      'DELETE /admin/services/plumber/skills/tap-repair': () => ({
        status: 409,
        body: {
          error: {
            code: 'SKILL_IN_USE',
            message: 'This skill is used by 1 price item. Change those first.',
          },
        },
      }),
    });
    const user = userEvent.setup();
    renderAt('/admin/catalog');

    await user.click(await screen.findByRole('tab', { name: 'Skills' }));
    await user.click(screen.getByRole('button', { name: 'Remove Tap and faucet repair' }));

    expect(await screen.findByText(/used by 1 price item/)).toBeInTheDocument();
  });

  it('edits the safety steps, one per line', async () => {
    const catalog = makeCatalog();
    const fetchMock = signedInAdmin({
      'GET /admin/catalog': () => ({ body: { data: catalog } }),
      // like the real server: the saved steps come back on the next load
      'PATCH /admin/safety-tips/gas-leak': (body) => {
        catalog.safetyTips[0]!.tips = (body as { tips: string[] }).tips;
        return { body: { data: {} } };
      },
    });
    const user = userEvent.setup();
    renderAt('/admin/catalog');

    await user.click(await screen.findByRole('tab', { name: 'Safety tips' }));
    const card = screen.getByRole('form', { name: 'Gas smell or gas leak' });
    const steps = within(card).getByLabelText(/Safety steps/);
    await user.type(steps, '{End}{Enter}Open the windows.');
    await user.click(within(card).getByRole('button', { name: 'Save steps' }));

    expect(await within(card).findByText('Saved')).toBeInTheDocument();
    expect(sentTo(fetchMock, 'PATCH', '/admin/safety-tips/gas-leak')).toEqual({
      tips: ['Turn off the gas.', 'Open the windows.'],
    });
  });
});
