import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockApi, renderAt, testUsers } from '../test/helpers';

describe('Login page', () => {
  it('logs a technician in and takes them to their page', async () => {
    const fetchMock = mockApi({
      'POST /auth/login': () => ({
        body: { data: { token: 'tok-123', user: testUsers.technician } },
      }),
    });
    const user = userEvent.setup();
    renderAt('/login');

    await user.type(screen.getByLabelText('Phone or email'), '01700000004');
    await user.type(screen.getByLabelText('Password'), 'secret-pass');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('heading', { name: 'My profile' })).toBeTruthy();
    expect(localStorage.getItem('karigor.token')).toBe('tok-123');
    expect(JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)).toEqual({
      phoneOrEmail: '01700000004',
      password: 'secret-pass',
    });
  });

  it('shows the message from the server when the login is wrong', async () => {
    mockApi({
      'POST /auth/login': () => ({
        status: 401,
        body: { error: { code: 'WRONG_LOGIN', message: 'Wrong phone/email or password.' } },
      }),
    });
    const user = userEvent.setup();
    renderAt('/login');

    await user.type(screen.getByLabelText('Phone or email'), '01700000004');
    await user.type(screen.getByLabelText('Password'), 'wrong-pass');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong phone/email or password.');
    expect(screen.getByRole('button', { name: 'Log in' })).toBeEnabled();
  });

  it('asks for empty fields without calling the server', async () => {
    const fetchMock = mockApi({});
    const user = userEvent.setup();
    renderAt('/login');

    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(screen.getByText('Enter your phone number or email')).toBeTruthy();
    expect(screen.getByText('Enter your password')).toBeTruthy();
    expect(screen.getByLabelText('Phone or email')).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('explains when the internet is down', async () => {
    const user = userEvent.setup();
    renderAt('/login');
    mockApi({});
    globalThis.fetch = () => Promise.reject(new TypeError('Failed to fetch'));

    await user.type(screen.getByLabelText('Phone or email'), '01700000004');
    await user.type(screen.getByLabelText('Password'), 'secret-pass');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach Karigor right now");
  });

  it('can show and hide the password', async () => {
    const user = userEvent.setup();
    renderAt('/login');
    const password = screen.getByLabelText('Password');

    expect(password).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(password).toHaveAttribute('type', 'password');
  });
});

describe('Sign up page', () => {
  it('creates a technician account with the chosen role', async () => {
    const fetchMock = mockApi({
      'POST /auth/register': () => ({
        status: 201,
        body: { data: { token: 'tok-456', user: testUsers.technician } },
      }),
    });
    const user = userEvent.setup();
    renderAt('/register');

    await user.click(screen.getByLabelText(/I am a karigor/));
    await user.type(screen.getByLabelText('Full name'), 'Jamal Hossain');
    await user.type(screen.getByLabelText('Mobile number'), '01700000004');
    await user.type(screen.getByLabelText('Password'), 'secret-pass');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('heading', { name: 'My profile' })).toBeTruthy();
    expect(JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)).toEqual({
      name: 'Jamal Hossain',
      phone: '01700000004',
      email: '',
      password: 'secret-pass',
      role: 'technician',
    });
  });

  it('starts with "I need a karigor" chosen', () => {
    renderAt('/register');

    expect(screen.getByLabelText(/I need a karigor/)).toBeChecked();
  });

  it('shows each server error under the right field', async () => {
    mockApi({
      'POST /auth/register': () => ({
        status: 400,
        body: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Please check the highlighted fields.',
            details: [
              { field: 'phone', message: 'Enter a mobile number like 01712345678' },
              { field: 'password', message: 'Password must be at least 8 characters' },
            ],
          },
        },
      }),
    });
    const user = userEvent.setup();
    renderAt('/register');

    await user.type(screen.getByLabelText('Full name'), 'Nusrat');
    await user.type(screen.getByLabelText('Mobile number'), '12345');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Enter a mobile number like 01712345678')).toBeTruthy();
    expect(screen.getByText('Password must be at least 8 characters')).toBeTruthy();
    expect(screen.getByLabelText('Mobile number')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Full name')).not.toHaveAttribute('aria-invalid');
  });

  it('shows a clear message when the phone already has an account', async () => {
    mockApi({
      'POST /auth/register': () => ({
        status: 409,
        body: {
          error: {
            code: 'PHONE_TAKEN',
            message: 'An account with this phone number already exists.',
          },
        },
      }),
    });
    const user = userEvent.setup();
    renderAt('/register');

    await user.type(screen.getByLabelText('Full name'), 'Nusrat');
    await user.type(screen.getByLabelText('Mobile number'), '01800000001');
    await user.type(screen.getByLabelText('Password'), 'secret-pass');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('already exists');
  });
});

describe('staying logged in', () => {
  it('remembers the user after a page reload', async () => {
    localStorage.setItem('karigor.token', 'saved-token');
    mockApi({ 'GET /auth/me': () => ({ body: { data: { user: testUsers.customer } } }) });

    renderAt('/request');

    expect(await screen.findByRole('heading', { name: 'Get help' })).toBeTruthy();
  });

  it('forgets an expired login and sends the user to log in', async () => {
    localStorage.setItem('karigor.token', 'old-token');
    mockApi({
      'GET /auth/me': () => ({
        status: 401,
        body: { error: { code: 'INVALID_TOKEN', message: 'Your login has expired.' } },
      }),
    });

    renderAt('/request');

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeTruthy();
    expect(localStorage.getItem('karigor.token')).toBeNull();
  });

  it('sends logged-in users away from the login page', async () => {
    localStorage.setItem('karigor.token', 'saved-token');
    mockApi({ 'GET /auth/me': () => ({ body: { data: { user: testUsers.admin } } }) });

    renderAt('/login');

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeTruthy();
  });

  it('keeps people out of pages for other roles', async () => {
    localStorage.setItem('karigor.token', 'saved-token');
    mockApi({ 'GET /auth/me': () => ({ body: { data: { user: testUsers.customer } } }) });

    renderAt('/admin');

    expect(await screen.findByRole('heading', { name: 'Get help' })).toBeTruthy();
  });

  it('logs out', async () => {
    localStorage.setItem('karigor.token', 'saved-token');
    mockApi({ 'GET /auth/me': () => ({ body: { data: { user: testUsers.customer } } }) });
    const user = userEvent.setup();
    renderAt('/request');

    await user.click(await screen.findByRole('button', { name: 'Log out' }));

    await waitFor(() => expect(localStorage.getItem('karigor.token')).toBeNull());
    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeTruthy();
  });
});
