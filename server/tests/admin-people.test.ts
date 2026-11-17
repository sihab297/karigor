import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { BookingModel } from '../src/models/booking.model';
import { ProblemReportModel } from '../src/models/problem-report.model';
import { ServiceModel } from '../src/models/service.model';
import { UserModel, type UserRole } from '../src/models/user.model';
import { catalogDocs } from '../src/seed/seed-data';
import { createToken } from '../src/utils/jwt';
import { useTestDatabase } from './helpers/test-db';

useTestDatabase();

const app = createApp();

type TestUser = { id: string; token: string };
let admin: TestUser;
let nusrat: TestUser;
let tanvir: TestUser;
let rahim: TestUser;
let phone = 0;

async function makeUser(role: UserRole, name: string) {
  const user = await UserModel.create({
    name,
    phone: `0170000${String(phone++).padStart(4, '0')}`,
    passwordHash: 'x',
    role,
  });
  return { id: user.id as string, token: createToken(user.id, role) };
}

async function makeBooking(customerId: string, status = 'requested') {
  const report = await ProblemReportModel.create({ customerId, mode: 'describe', text: 'x' });
  const booking = await new BookingModel({
    customerId,
    technicianId: rahim.id,
    problemReportId: report.id,
    serviceId: 'plumber',
    scheduledAt: new Date(),
    location: { type: 'Point', coordinates: [90.3654, 23.8223] },
    addressText: 'House 12, Road 5',
    status,
  }).save();
  return booking.id as string;
}

const asAdmin = (method: 'get' | 'patch', path: string, body?: object) => {
  const req = request(app)
    [method](`/api/v1/admin${path}`)
    .set('Authorization', `Bearer ${admin.token}`);
  return body ? req.send(body) : req;
};

beforeEach(async () => {
  phone = 0;
  await ServiceModel.insertMany(catalogDocs().services);
  admin = await makeUser('admin', 'Karigor Admin');
  nusrat = await makeUser('customer', 'Nusrat Jahan');
  tanvir = await makeUser('customer', 'Tanvir Hasan');
  rahim = await makeUser('technician', 'Rahim Uddin');
});

describe('GET /api/v1/admin/bookings', () => {
  it('lists every booking with both people, filtered by status and search', async () => {
    const first = await makeBooking(nusrat.id, 'completed');
    await makeBooking(tanvir.id, 'requested');

    const all = await asAdmin('get', '/bookings');
    expect(all.status).toBe(200);
    expect(all.body.data.total).toBe(2);
    expect(all.body.data.bookings[1]).toMatchObject({
      id: first,
      status: 'completed',
      serviceName: 'Plumber',
      customer: { name: 'Nusrat Jahan' },
      technician: { name: 'Rahim Uddin' },
      actions: [],
    });

    const done = await asAdmin('get', '/bookings?status=completed');
    expect(done.body.data.bookings.map((b: { id: string }) => b.id)).toEqual([first]);

    const byName = await asAdmin('get', '/bookings?q=tanvir');
    expect(byName.body.data.total).toBe(1);
    expect(byName.body.data.bookings[0].customer.name).toBe('Tanvir Hasan');

    const byId = await asAdmin('get', `/bookings?q=${first}`);
    expect(byId.body.data.bookings.map((b: { id: string }) => b.id)).toEqual([first]);
  });

  it('shows 20 at a time', async () => {
    for (let i = 0; i < 21; i++) await makeBooking(nusrat.id);

    const pageOne = await asAdmin('get', '/bookings');
    const pageTwo = await asAdmin('get', '/bookings?page=2');

    expect(pageOne.body.data).toMatchObject({ total: 21, page: 1, pageSize: 20 });
    expect(pageOne.body.data.bookings).toHaveLength(20);
    expect(pageTwo.body.data.bookings).toHaveLength(1);
  });
});

describe('GET /api/v1/admin/users', () => {
  it('lists users with their bookings and jobs, filtered and searched', async () => {
    await makeBooking(nusrat.id);
    await makeBooking(nusrat.id);

    const all = await asAdmin('get', '/users');
    expect(all.body.data.total).toBe(4);
    const byName = Object.fromEntries(
      all.body.data.users.map((u: { name: string; bookings: number }) => [u.name, u.bookings]),
    );
    expect(byName).toMatchObject({ 'Nusrat Jahan': 2, 'Tanvir Hasan': 0, 'Rahim Uddin': 2 });

    const customers = await asAdmin('get', '/users?role=customer');
    expect(customers.body.data.total).toBe(2);

    const search = await asAdmin('get', '/users?q=nusrat');
    expect(search.body.data.users.map((u: { name: string }) => u.name)).toEqual(['Nusrat Jahan']);

    // typed symbols are plain text, not a pattern that matches everyone
    const symbols = await asAdmin('get', '/users?q=.*');
    expect(symbols.body.data.total).toBe(0);
  });
});

describe('PATCH /api/v1/admin/users/:id/status', () => {
  it('blocks a user straight away, and unblocks them', async () => {
    const blocked = await asAdmin('patch', `/users/${nusrat.id}/status`, { status: 'blocked' });
    expect(blocked.status).toBe(200);
    expect(blocked.body.data.user.status).toBe('blocked');

    const tryAgain = await request(app)
      .get('/api/v1/bookings')
      .set('Authorization', `Bearer ${nusrat.token}`);
    expect(tryAgain.status).toBe(403);
    expect(tryAgain.body.error.code).toBe('ACCOUNT_BLOCKED');

    const onlyBlocked = await asAdmin('get', '/users?status=blocked');
    expect(onlyBlocked.body.data.users.map((u: { name: string }) => u.name)).toEqual([
      'Nusrat Jahan',
    ]);

    await asAdmin('patch', `/users/${nusrat.id}/status`, { status: 'active' });
    const back = await request(app)
      .get('/api/v1/bookings')
      .set('Authorization', `Bearer ${nusrat.token}`);
    expect(back.status).toBe(200);
  });

  it("can't block an admin", async () => {
    const self = await asAdmin('patch', `/users/${admin.id}/status`, { status: 'blocked' });
    expect(self.status).toBe(403);
    expect((await asAdmin('patch', '/users/not-an-id/status', { status: 'blocked' })).status).toBe(
      404,
    );
    expect((await asAdmin('patch', `/users/${nusrat.id}/status`, { status: 'gone' })).status).toBe(
      400,
    );
  });

  it('is only for the admin', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${tanvir.id}/status`)
      .set('Authorization', `Bearer ${nusrat.token}`)
      .send({ status: 'blocked' });
    expect(res.status).toBe(403);
  });
});
