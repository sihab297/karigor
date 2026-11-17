import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { ReviewModel } from '../src/models/review.model';
import { ServiceModel } from '../src/models/service.model';
import { TechnicianProfileModel } from '../src/models/technician-profile.model';
import { UserModel, type UserRole } from '../src/models/user.model';
import { catalogDocs } from '../src/seed/seed-data';
import { createToken } from '../src/utils/jwt';
import { Types } from 'mongoose';
import { useTestDatabase } from './helpers/test-db';

useTestDatabase();

const app = createApp();

type TestUser = { id: string; token: string };
let customer: TestUser;
let phone = 0;

async function makeUser(
  role: UserRole,
  name = `Test ${role}`,
  status: 'active' | 'blocked' = 'active',
) {
  const user = await UserModel.create({
    name,
    phone: `0170000${String(phone++).padStart(4, '0')}`,
    passwordHash: 'x',
    role,
    status,
  });
  return { id: user.id as string, token: createToken(user.id, role) };
}

async function makeTechnician(extra: object = {}, status: 'active' | 'blocked' = 'active') {
  const user = await makeUser('technician', 'Rahim Uddin', status);
  await new TechnicianProfileModel({
    userId: user.id,
    serviceIds: ['plumber', 'gas-fitter'],
    skillIds: ['tap-repair', 'pipe-leak'],
    areaName: 'Mirpur',
    location: { type: 'Point', coordinates: [90.3654, 23.8223] },
    serviceRadiusKm: 10,
    workingDays: [6, 0, 1, 2, 3, 4],
    workingHours: { start: '09:00', end: '20:00' },
    experienceYears: 6,
    approvalStatus: 'approved',
    ratingAvg: 4.75,
    ratingCount: 2,
    jobsDone: { plumber: 49, 'gas-fitter': 8 },
    nidPhotoPublicId: 'secret-nid',
    ...extra,
  }).save();
  return user;
}

const get = (path: string, token = customer.token) =>
  request(app).get(`/api/v1/technicians/${path}`).set('Authorization', `Bearer ${token}`);

beforeEach(async () => {
  phone = 0;
  await ServiceModel.insertMany(catalogDocs().services);
  customer = await makeUser('customer', 'Nusrat Jahan');
});

describe('GET /api/v1/technicians/:id', () => {
  it('shows services, skills, rating and jobs, but nothing private', async () => {
    const rahim = await makeTechnician();

    const res = await get(rahim.id);

    expect(res.status).toBe(200);
    const tech = res.body.data.technician;
    expect(tech).toMatchObject({
      id: rahim.id,
      name: 'Rahim Uddin',
      areaName: 'Mirpur',
      experienceYears: 6,
      rating: 4.8,
      ratingCount: 2,
      jobsDone: 57,
      workingDays: [6, 0, 1, 2, 3, 4],
      workingHours: { start: '09:00', end: '20:00' },
    });
    const plumber = tech.services.find((s: { id: string }) => s.id === 'plumber');
    expect(plumber.jobsDone).toBe(49);
    expect(plumber.skills.map((s: { id: string }) => s.id).sort()).toEqual([
      'pipe-leak',
      'tap-repair',
    ]);
    const text = JSON.stringify(res.body);
    expect(text).not.toContain('secret-nid');
    expect(text).not.toContain('01700');
    expect(text).not.toContain('coordinates');
  });

  it('hides technicians who are not approved or are blocked, except from the admin', async () => {
    const pending = await makeTechnician({ approvalStatus: 'pending' });
    expect((await get(pending.id)).status).toBe(404);

    const blocked = await makeTechnician({}, 'blocked');
    expect((await get(blocked.id)).status).toBe(404);

    expect((await get(customer.id)).status).toBe(404);
    expect((await get('not-an-id')).status).toBe(404);

    const admin = await makeUser('admin');
    expect((await get(pending.id, admin.token)).status).toBe(200);
  });

  it('needs a login', async () => {
    const rahim = await makeTechnician();
    expect((await request(app).get(`/api/v1/technicians/${rahim.id}`)).status).toBe(401);
  });
});

describe('GET /api/v1/technicians/:id/reviews', () => {
  it('lists the newest reviews with short customer names', async () => {
    const rahim = await makeTechnician();
    const tanvir = await makeUser('customer', 'Tanvir Hasan');
    await ReviewModel.create({
      bookingId: new Types.ObjectId(),
      customerId: tanvir.id,
      technicianId: rahim.id,
      serviceId: 'plumber',
      rating: 4,
      comment: 'Good work on the pump',
      createdAt: new Date('2026-10-15T10:00:00Z'),
    });
    await ReviewModel.create({
      bookingId: new Types.ObjectId(),
      customerId: customer.id,
      technicianId: rahim.id,
      serviceId: 'gas-fitter',
      rating: 5,
      comment: 'Came on time',
      createdAt: new Date('2026-10-28T10:00:00Z'),
    });

    const res = await get(`${rahim.id}/reviews`);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.reviews).toMatchObject([
      { rating: 5, comment: 'Came on time', serviceName: 'Gas Fitter', customerName: 'Nusrat J.' },
      { rating: 4, serviceName: 'Plumber', customerName: 'Tanvir H.' },
    ]);
    expect(JSON.stringify(res.body)).not.toContain('Jahan');
  });

  it('follows the same visibility rules', async () => {
    const pending = await makeTechnician({ approvalStatus: 'pending' });
    expect((await get(`${pending.id}/reviews`)).status).toBe(404);
  });
});
