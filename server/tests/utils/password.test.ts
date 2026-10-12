import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/utils/password';

describe('password hashing', () => {
  it('never stores the password itself', async () => {
    const hash = await hashPassword('my-secret-123');

    expect(hash).not.toContain('my-secret-123');
    expect(hash).toMatch(/^\$2[aby]\$10\$/);
  });

  it('gives a different hash each time for the same password', async () => {
    expect(await hashPassword('same-password')).not.toBe(await hashPassword('same-password'));
  });

  it('accepts the right password and rejects a wrong one', async () => {
    const hash = await hashPassword('my-secret-123');

    expect(await verifyPassword('my-secret-123', hash)).toBe(true);
    expect(await verifyPassword('my-secret-124', hash)).toBe(false);
  });
});
