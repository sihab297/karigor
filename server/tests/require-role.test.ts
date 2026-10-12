import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { errorHandler } from '../src/middleware/error-handler';
import { requireAuth } from '../src/middleware/require-auth';
import { requireRole } from '../src/middleware/require-role';
import { UserModel, type UserRole } from '../src/models/user.model';
import { createToken } from '../src/utils/jwt';
import { useTestDatabase } from './helpers/test-db';

useTestDatabase();

// a small app with pretend pages, just to test the checks
const app = express();
const ok = (_req: express.Request, res: express.Response) => {
  res.json({ data: 'ok' });
};
app.get('/admin-only', requireAuth, requireRole('admin'), ok);
app.get('/technicians-and-admins', requireAuth, requireRole('technician', 'admin'), ok);
app.get('/forgot-require-auth', requireRole('admin'), ok);
app.use(errorHandler);

let phoneCounter = 0;
async function tokenFor(role: UserRole, status: 'active' | 'blocked' = 'active') {
  const user = await UserModel.create({
    name: `Test ${role}`,
    phone: `0171000000${phoneCounter++}`,
    passwordHash: 'not-used',
    role,
    status,
  });
  return { user, token: createToken(user.id, role) };
}

const visit = (path: string, token?: string) => {
  const req = request(app).get(path);
  return token ? req.set('Authorization', `Bearer ${token}`) : req;
};

beforeEach(() => {
  phoneCounter = 0;
});

describe('requireRole', () => {
  it('lets the right role in', async () => {
    const { token } = await tokenFor('admin');
    const res = await visit('/admin-only', token);

    expect(res.status).toBe(200);
  });

  it('accepts any of several roles', async () => {
    const technician = await tokenFor('technician');
    const admin = await tokenFor('admin');

    expect((await visit('/technicians-and-admins', technician.token)).status).toBe(200);
    expect((await visit('/technicians-and-admins', admin.token)).status).toBe(200);
  });

  it('stops other roles', async () => {
    const customer = await tokenFor('customer');
    const technician = await tokenFor('technician');

    const res = await visit('/admin-only', customer.token);
    expect(res.status).toBe(403);
    expect(res.body.error).toEqual({
      code: 'NOT_ALLOWED',
      message: "You don't have permission to do this.",
    });
    expect((await visit('/admin-only', technician.token)).status).toBe(403);
    expect((await visit('/technicians-and-admins', customer.token)).status).toBe(403);
  });

  it('needs a login first', async () => {
    const res = await visit('/admin-only');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NOT_LOGGED_IN');
  });

  it('stops blocked users even if their role is right', async () => {
    const { token } = await tokenFor('admin', 'blocked');
    const res = await visit('/admin-only', token);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_BLOCKED');
  });

  it('uses the role saved in the database, not the one in the token', async () => {
    const { user } = await tokenFor('customer');
    const tokenClaimingAdmin = createToken(user.id, 'admin');

    expect((await visit('/admin-only', tokenClaimingAdmin)).status).toBe(403);

    await UserModel.updateOne({ _id: user._id }, { role: 'admin' });
    const oldCustomerToken = createToken(user.id, 'customer');
    expect((await visit('/admin-only', oldCustomerToken)).status).toBe(200);
  });

  it('is safe even if requireAuth is forgotten', async () => {
    const { token } = await tokenFor('admin');
    const res = await visit('/forgot-require-auth', token);

    expect(res.status).toBe(401);
  });
});
