import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { UserModel } from '../../src/models/user.model';

function validUser(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Rahim Uddin',
    phone: '01712345678',
    email: 'rahim@example.com',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuv',
    role: 'customer',
    ...overrides,
  };
}

async function errorsOf(data: Record<string, unknown>) {
  try {
    await new UserModel(data).validate();
    return {};
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) return error.errors;
    throw error;
  }
}

describe('UserModel', () => {
  it('accepts a valid user and sets defaults', async () => {
    const user = new UserModel(validUser());

    await expect(user.validate()).resolves.toBeUndefined();
    expect(user.status).toBe('active');
  });

  it('requires name, phone, password and role', async () => {
    const errors = await errorsOf({});

    expect(Object.keys(errors).sort()).toEqual(['name', 'passwordHash', 'phone', 'role']);
    expect(errors.phone?.message).toBe('Phone number is required');
  });

  it('stores phone numbers in one standard form', () => {
    expect(new UserModel(validUser({ phone: '+8801712-345678' })).phone).toBe('01712345678');
    expect(new UserModel(validUser({ phone: '০১৭১২৩৪৫৬৭৮' })).phone).toBe('01712345678');
  });

  it('rejects numbers that are not Bangladeshi mobile numbers', async () => {
    expect((await errorsOf(validUser({ phone: '0212345678' }))).phone?.message).toMatch(
      /Bangladeshi/,
    );
    expect((await errorsOf(validUser({ phone: '12345' }))).phone).toBeDefined();
  });

  it('makes email optional, lowercase and checked', async () => {
    expect((await errorsOf(validUser({ email: undefined }))).email).toBeUndefined();
    expect(new UserModel(validUser({ email: ' Rahim@Example.COM ' })).email).toBe(
      'rahim@example.com',
    );
    expect((await errorsOf(validUser({ email: 'not-an-email' }))).email?.message).toBe(
      'Email is not valid',
    );
  });

  it('only allows the three roles and two statuses', async () => {
    expect((await errorsOf(validUser({ role: 'superadmin' }))).role).toBeDefined();
    expect((await errorsOf(validUser({ status: 'deleted' }))).status).toBeDefined();
  });

  it('never sends the password hash in JSON, and uses id instead of _id', () => {
    const json = new UserModel(validUser()).toJSON() as Record<string, unknown>;

    expect(json.passwordHash).toBeUndefined();
    expect(json._id).toBeUndefined();
    expect(json.__v).toBeUndefined();
    expect(typeof json.id).toBe('string');
  });

  it('does not load the password hash unless asked', () => {
    expect(UserModel.schema.path('passwordHash').options.select).toBe(false);
  });

  it('declares unique indexes for phone and (optional) email', () => {
    const indexes = UserModel.schema.indexes();

    expect(indexes).toContainEqual([{ phone: 1 }, expect.objectContaining({ unique: true })]);
    expect(indexes).toContainEqual([
      { email: 1 },
      expect.objectContaining({
        unique: true,
        partialFilterExpression: { email: { $type: 'string' } },
      }),
    ]);
  });
});
