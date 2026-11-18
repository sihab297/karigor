import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { UserModel, USER_ROLES, type UserRole } from '../src/models/user.model';
import { createToken } from '../src/utils/jwt';
import { useTestDatabase } from './helpers/test-db';

useTestDatabase();

const app = createApp();
// a real-looking id that points at nothing
const ID = '64b7f0c2a1b2c3d4e5f60718';

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';
const C: UserRole = 'customer';
const T: UserRole = 'technician';
const A: UserRole = 'admin';

// every route that needs a login, and who may use it (docs/05-api.md)
const ROUTES: [Method, string, UserRole[]][] = [
  ['get', '/auth/me', [C, T, A]],
  ['post', '/problems/analyze', [C]],
  ['get', `/problems/${ID}`, [C, A]],
  ['patch', `/problems/${ID}`, [C]],
  ['post', `/problems/${ID}/matches`, [C]],
  ['post', '/bookings', [C]],
  ['get', '/bookings', [C, T]],
  ['get', `/bookings/${ID}`, [C, T, A]],
  ['patch', `/bookings/${ID}/status`, [C, T]],
  ['get', `/bookings/${ID}/messages`, [C, T]],
  ['post', `/bookings/${ID}/review`, [C]],
  ['get', '/technicians/me/profile', [T]],
  ['put', '/technicians/me/profile', [T]],
  ['patch', '/technicians/me/availability', [T]],
  ['post', '/technicians/me/nid', [T]],
  ['get', `/technicians/${ID}`, [C, T, A]],
  ['get', `/technicians/${ID}/reviews`, [C, T, A]],
  ['get', '/admin/stats', [A]],
  ['get', '/admin/technicians', [A]],
  ['get', `/admin/technicians/${ID}/nid`, [A]],
  ['patch', `/admin/technicians/${ID}/approval`, [A]],
  ['get', '/admin/catalog', [A]],
  ['patch', '/admin/services/plumber', [A]],
  ['post', '/admin/services/plumber/skills', [A]],
  ['patch', '/admin/services/plumber/skills/tap-repair', [A]],
  ['delete', '/admin/services/plumber/skills/tap-repair', [A]],
  ['post', '/admin/price-items', [A]],
  ['patch', '/admin/price-items/plumber-tap', [A]],
  ['delete', '/admin/price-items/plumber-tap', [A]],
  ['patch', '/admin/safety-tips/gas-leak', [A]],
  ['get', '/admin/bookings', [A]],
  ['get', '/admin/users', [A]],
  ['patch', `/admin/users/${ID}/status`, [A]],
];

// open to everyone, logged in or not
const PUBLIC: string[] = ['/health', '/services', '/services/plumber/quick-picks', '/areas'];

let tokens: Record<UserRole, string>;

beforeEach(async () => {
  const entries = await Promise.all(
    USER_ROLES.map(async (role, index) => {
      const user = await UserModel.create({
        name: `Test ${role}`,
        phone: `0172000000${index}`,
        passwordHash: 'not-used',
        role,
      });
      return [role, createToken(user.id, role)] as const;
    }),
  );
  tokens = Object.fromEntries(entries) as Record<UserRole, string>;
});

const call = (method: Method, path: string, token?: string) => {
  const req = request(app)[method](`/api/v1${path}`).send({});
  return token ? req.set('Authorization', `Bearer ${token}`) : req;
};

describe('who can use each API route', () => {
  it.each(ROUTES)('%s %s', async (method, path, allowed) => {
    const noLogin = await call(method, path);
    expect(noLogin.status, 'without a login').toBe(401);

    for (const role of USER_ROLES) {
      const res = await call(method, path, tokens[role]);
      if (allowed.includes(role)) {
        // past the login and role checks; the route may still say "not found" or "wrong input"
        expect([401, 403], `${role} should get in`).not.toContain(res.status);
      } else {
        expect(res.status, `${role} should be stopped`).toBe(403);
        expect(res.body.error.code).toBe('NOT_ALLOWED');
      }
    }
  });

  it.each(PUBLIC)('GET %s needs no login', async (path) => {
    const res = await call('get', path);
    expect([401, 403]).not.toContain(res.status);
  });
});
