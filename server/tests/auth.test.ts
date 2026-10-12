import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { UserModel } from '../src/models/user.model';
import { createToken } from '../src/utils/jwt';
import { verifyPassword } from '../src/utils/password';
import { useTestDatabase } from './helpers/test-db';

useTestDatabase();

let app: ReturnType<typeof createApp>;
beforeEach(() => {
  app = createApp();
});

const customer = {
  name: 'Nusrat Jahan',
  phone: '01812345678',
  email: 'nusrat@example.com',
  password: 'secret-pass-1',
  role: 'customer',
};

const register = (body: object) => request(app).post('/api/v1/auth/register').send(body);
const login = (body: object) => request(app).post('/api/v1/auth/login').send(body);
const me = (token?: string) => {
  const req = request(app).get('/api/v1/auth/me');
  return token ? req.set('Authorization', `Bearer ${token}`) : req;
};

describe('POST /auth/register', () => {
  it('creates a customer and logs them in', async () => {
    const res = await register(customer);

    expect(res.status).toBe(201);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user).toMatchObject({
      name: 'Nusrat Jahan',
      phone: '01812345678',
      email: 'nusrat@example.com',
      role: 'customer',
      status: 'active',
    });
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('creates a technician', async () => {
    const res = await register({ ...customer, role: 'technician' });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('technician');
  });

  it('saves a hash, never the password itself', async () => {
    await register(customer);
    const saved = await UserModel.findOne({ phone: customer.phone }).select('+passwordHash');

    expect(saved!.passwordHash).not.toBe(customer.password);
    expect(await verifyPassword(customer.password, saved!.passwordHash)).toBe(true);
  });

  it('works without an email', async () => {
    const res = await register({ ...customer, email: '' });

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBeUndefined();
  });

  it('does not allow signing up as admin', async () => {
    const res = await register({ ...customer, role: 'admin' });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toContainEqual({
      field: 'role',
      message: 'Choose customer or technician',
    });
  });

  it('explains every wrong field', async () => {
    const res = await register({ name: 'A', phone: '12345', email: 'nope', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = res.body.error.details.map((d: { field: string }) => d.field).sort();
    expect(fields).toEqual(['email', 'name', 'password', 'phone', 'role']);
  });

  it('refuses a phone number that already has an account, however it is typed', async () => {
    await register(customer);
    const res = await register({ ...customer, email: undefined, phone: '+880 1812-345678' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PHONE_TAKEN');
  });

  it('refuses an email that already has an account', async () => {
    await register(customer);
    const res = await register({ ...customer, phone: '01912345678', email: 'NUSRAT@example.com' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('answers bad JSON with a clear error', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"name": ');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });
});

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await register(customer);
  });

  it('logs in with phone number', async () => {
    const res = await login({ phoneOrEmail: '01812345678', password: customer.password });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user.phone).toBe('01812345678');
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('logs in with email, in any letter case', async () => {
    const res = await login({ phoneOrEmail: 'Nusrat@Example.com', password: customer.password });

    expect(res.status).toBe(200);
  });

  it('logs in with the phone typed another way', async () => {
    const res = await login({ phoneOrEmail: '০১৮১২৩৪৫৬৭৮', password: customer.password });

    expect(res.status).toBe(200);
  });

  it('gives the same answer for a wrong password and an unknown phone', async () => {
    const wrongPassword = await login({ phoneOrEmail: customer.phone, password: 'not-it-123' });
    const unknownPhone = await login({ phoneOrEmail: '01999999999', password: 'not-it-123' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownPhone.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownPhone.body);
    expect(wrongPassword.body.error.message).toBe('Wrong phone/email or password.');
  });

  it('refuses blocked accounts', async () => {
    await UserModel.updateOne({ phone: customer.phone }, { status: 'blocked' });
    const res = await login({ phoneOrEmail: customer.phone, password: customer.password });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_BLOCKED');
  });

  it('needs both fields', async () => {
    const res = await login({});

    expect(res.status).toBe(400);
    expect(res.body.error.details).toHaveLength(2);
  });
});

describe('GET /auth/me', () => {
  it('returns the logged-in user', async () => {
    const { token } = (await register(customer)).body.data;
    const res = await me(token);

    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ phone: customer.phone, role: 'customer' });
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('needs a token', async () => {
    const res = await me();

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NOT_LOGGED_IN');
  });

  it('refuses a fake token', async () => {
    const fake = jwt.sign({ role: 'admin' }, 'some-other-secret-key-that-is-long', {
      subject: new Types.ObjectId().toString(),
    });
    const res = await me(fake);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('refuses an expired token', async () => {
    const { user } = (await register(customer)).body.data;
    const expired = jwt.sign(
      { role: 'customer', exp: Math.floor(Date.now() / 1000) - 60 },
      env.JWT_SECRET,
      { subject: user.id },
    );
    const res = await me(expired);

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Your login has expired. Please log in again.');
  });

  it('refuses a token for a deleted account', async () => {
    const res = await me(createToken(new Types.ObjectId().toString(), 'customer'));

    expect(res.status).toBe(401);
  });

  it('stops a blocked user straight away, even with a valid token', async () => {
    const { token } = (await register(customer)).body.data;
    await UserModel.updateOne({ phone: customer.phone }, { status: 'blocked' });
    const res = await me(token);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_BLOCKED');
  });
});

describe('too many attempts', () => {
  it('slows down password guessing after 20 tries', async () => {
    const attempt = { phoneOrEmail: '01812345678', password: 'guess-123' };
    for (let i = 0; i < 20; i++) {
      expect((await login(attempt)).status).toBe(401);
    }
    const res = await login(attempt);

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('TOO_MANY_ATTEMPTS');
  });
});
