import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockApi, renderAt, testUsers } from '../test/helpers';

function loggedInAs(user: (typeof testUsers)[keyof typeof testUsers]) {
  localStorage.setItem('karigor.token', 'saved-token');
  mockApi({ 'GET /auth/me': () => ({ body: { data: { user } } }) });
}

const mainNav = () => screen.getAllByRole('navigation', { name: 'Main' })[0]!;
const linkNames = (nav: HTMLElement) =>
  within(nav)
    .getAllByRole('link')
    .map((link) => link.textContent);

describe('menu for each role', () => {
  it('shows customers their own links', async () => {
    loggedInAs(testUsers.customer);
    renderAt('/request');

    await screen.findByRole('heading', { name: 'What needs fixing?' });
    expect(linkNames(mainNav())).toEqual(['Get help', 'My bookings']);
  });

  it('shows technicians their own links', async () => {
    loggedInAs(testUsers.technician);
    renderAt('/tech/jobs');

    await screen.findByRole('heading', { name: 'My jobs' });
    expect(linkNames(mainNav())).toEqual(['My jobs', 'My profile']);
  });

  it('shows the admin their own links', async () => {
    loggedInAs(testUsers.admin);
    renderAt('/admin');

    await screen.findByRole('heading', { name: 'Dashboard' });
    expect(linkNames(mainNav())).toEqual([
      'Dashboard',
      'Technicians',
      'Services and prices',
      'Bookings and users',
    ]);
  });

  it('marks the page you are on', async () => {
    loggedInAs(testUsers.customer);
    renderAt('/bookings');

    await screen.findByRole('heading', { name: 'My bookings' });
    expect(within(mainNav()).getByRole('link', { name: 'My bookings' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(mainNav()).getByRole('link', { name: 'Get help' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('shows who is logged in and sets the tab title', async () => {
    loggedInAs(testUsers.technician);
    renderAt('/tech/profile');

    await screen.findByRole('heading', { name: 'My profile' });
    expect(screen.getByText('Jamal Hossain')).toBeInTheDocument();
    expect(screen.getByText('Technician')).toBeInTheDocument();
    expect(document.title).toBe('My profile · Karigor');
  });

  it('moves between pages with the menu', async () => {
    loggedInAs(testUsers.admin);
    const user = userEvent.setup();
    renderAt('/admin');

    await screen.findByRole('heading', { name: 'Dashboard' });
    await user.click(within(mainNav()).getByRole('link', { name: 'Technicians' }));

    expect(await screen.findByRole('heading', { name: 'Technicians' })).toBeInTheDocument();
  });
});

describe('protected pages', () => {
  it('sends logged-out visitors to log in, then back to the page they wanted', async () => {
    mockApi({
      'POST /auth/login': () => ({ body: { data: { token: 'tok', user: testUsers.customer } } }),
    });
    const user = userEvent.setup();
    renderAt('/bookings');

    await screen.findByRole('heading', { name: 'Log in' });
    await user.type(screen.getByLabelText('Phone or email'), '01800000001');
    await user.type(screen.getByLabelText('Password'), 'secret-pass');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('heading', { name: 'My bookings' })).toBeInTheDocument();
  });

  it("sends people to their own home when they open another role's page", async () => {
    loggedInAs(testUsers.technician);
    renderAt('/admin/catalog');

    expect(await screen.findByRole('heading', { name: 'My profile' })).toBeInTheDocument();
  });

  it('logs out from the header', async () => {
    loggedInAs(testUsers.customer);
    const user = userEvent.setup();
    renderAt('/request');

    await user.click(await screen.findByRole('button', { name: 'Log out' }));

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument();
    expect(localStorage.getItem('karigor.token')).toBeNull();
  });
});

describe('phone menu', () => {
  it('opens with the menu button and closes after choosing a page', async () => {
    loggedInAs(testUsers.customer);
    const user = userEvent.setup();
    renderAt('/request');
    await screen.findByRole('heading', { name: 'What needs fixing?' });

    const button = screen.getByRole('button', { name: 'Open menu' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await user.click(button);

    const menu = document.getElementById('mobile-menu')!;
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(within(menu).getByText(/01800000001/)).toBeInTheDocument();

    await user.click(within(menu).getByRole('link', { name: 'My bookings' }));

    expect(await screen.findByRole('heading', { name: 'My bookings' })).toBeInTheDocument();
    expect(document.getElementById('mobile-menu')).toBeNull();
  });

  it('closes with the Escape key', async () => {
    loggedInAs(testUsers.customer);
    const user = userEvent.setup();
    renderAt('/request');
    await screen.findByRole('heading', { name: 'What needs fixing?' });

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    await user.keyboard('{Escape}');

    await waitFor(() => expect(document.getElementById('mobile-menu')).toBeNull());
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveFocus();
  });

  it('can log out from the phone menu', async () => {
    loggedInAs(testUsers.customer);
    const user = userEvent.setup();
    renderAt('/request');
    await screen.findByRole('heading', { name: 'What needs fixing?' });

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    const menu = document.getElementById('mobile-menu')!;
    await user.click(within(menu).getByRole('button', { name: 'Log out' }));

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument();
  });
});
