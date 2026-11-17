import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mockApi, renderAt } from './test/helpers';

describe('App', () => {
  it('shows the home page with sign up and log in', () => {
    renderAt('/');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/find the right karigor/i);
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      '/register',
    );
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
  });

  it('shows each service with its starting price and the areas covered', async () => {
    mockApi({
      'GET /services': () => ({
        body: {
          data: {
            services: [
              {
                id: 'plumber',
                name: 'Plumber',
                nameBn: 'প্লাম্বার',
                skills: [],
                startingPrice: 200,
              },
            ],
          },
        },
      }),
      'GET /areas': () => ({
        body: {
          data: {
            areas: [
              { name: 'Mirpur', lat: 23.82, lng: 90.36 },
              { name: 'Uttara', lat: 23.87, lng: 90.38 },
            ],
          },
        },
      }),
    });
    renderAt('/');

    expect(await screen.findByText('from ৳200')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Areas we cover' })).toBeInTheDocument();
    expect(screen.getByText('Mirpur')).toBeInTheDocument();
    expect(screen.getByText('2 areas of Dhaka')).toBeInTheDocument();
  });

  it('shows a not found page for unknown links', () => {
    renderAt('/nothing-here');

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeTruthy();
  });
});
