import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

describe('App', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the home page and checks the API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { status: 'ok' } }) }),
    );

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Karigor' })).toBeTruthy();
    expect(await screen.findByText('API connected')).toBeTruthy();
  });

  it('shows a not found page for unknown links', () => {
    render(
      <MemoryRouter initialEntries={['/nothing-here']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeTruthy();
  });
});
