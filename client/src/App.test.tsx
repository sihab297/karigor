import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderAt } from './test/helpers';

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

  it('shows a not found page for unknown links', () => {
    renderAt('/nothing-here');

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeTruthy();
  });
});
