import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { ServiceModel } from '../src/models/service.model';
import { TechnicianProfileModel } from '../src/models/technician-profile.model';
import { UserModel, type UserRole } from '../src/models/user.model';
import { catalogDocs } from '../src/seed/seed-data';
import { createToken } from '../src/utils/jwt';
import { useTestDatabase } from './helpers/test-db';

useTestDatabase();

const app = createApp();
let technicianToken: string;
let technicianId: string;

async function makeUser(role: UserRole, phone: string) {
  const user = await UserModel.create({ name: `Test ${role}`, phone, passwordHash: 'x', role });
  return { id: user.id as string, token: createToken(user.id, role) };
}

beforeEach(async () => {
  await ServiceModel.insertMany(catalogDocs().services);
  ({ id: technicianId, token: technicianToken } = await makeUser('technician', '01710000001'));
});

const goodProfile = {
  serviceIds: ['electrician'],
  skillIds: ['fan', 'ips'],
  areaName: 'Mirpur',
  location: { lat: 23.8223, lng: 90.3654 },
  workingDays: [6, 0, 1, 2, 3, 4],
  workingHours: { start: '09:00', end: '20:00' },
  experienceYears: 5,
};

const getProfile = (token = technicianToken) =>
  request(app).get('/api/v1/technicians/me/profile').set('Authorization', `Bearer ${token}`);
const saveProfile = (body: object, token = technicianToken) =>
  request(app)
    .put('/api/v1/technicians/me/profile')
    .set('Authorization', `Bearer ${token}`)
    .send(body);
const setAvailability = (body: object) =>
  request(app)
    .patch('/api/v1/technicians/me/availability')
    .set('Authorization', `Bearer ${technicianToken}`)
    .send(body);

const fieldsOf = (res: request.Response) =>
  res.body.error.details.map((d: { field: string }) => d.field);

describe('GET /technicians/me/profile', () => {
  it('returns null before the technician fills in a profile', async () => {
    const res = await getProfile();

    expect(res.status).toBe(200);
    expect(res.body.data.profile).toBeNull();
  });
});

describe('PUT /technicians/me/profile', () => {
  it('creates the profile, waiting for approval', async () => {
    const res = await saveProfile(goodProfile);

    expect(res.status).toBe(200);
    expect(res.body.data.profile).toMatchObject({
      userId: technicianId,
      serviceIds: ['electrician'],
      skillIds: ['fan', 'ips'],
      areaName: 'Mirpur',
      location: { type: 'Point', coordinates: [90.3654, 23.8223] },
      serviceRadiusKm: 10,
      workingDays: [0, 1, 2, 3, 4, 6],
      approvalStatus: 'pending',
      acceptingJobs: true,
      hasNidPhoto: false,
    });
    expect(res.body.data.profile.nidPhotoPublicId).toBeUndefined();
  });

  it('updates the same profile instead of making a second one', async () => {
    await saveProfile(goodProfile);
    const res = await saveProfile({ ...goodProfile, areaName: 'Pallabi', experienceYears: 6 });

    expect(res.body.data.profile.areaName).toBe('Pallabi');
    expect(await TechnicianProfileModel.countDocuments()).toBe(1);
    expect((await getProfile()).body.data.profile.experienceYears).toBe(6);
  });

  it('keeps an approved technician approved after editing', async () => {
    await saveProfile(goodProfile);
    await TechnicianProfileModel.updateOne({}, { approvalStatus: 'approved' });

    const res = await saveProfile({ ...goodProfile, experienceYears: 7 });

    expect(res.body.data.profile.approvalStatus).toBe('approved');
  });

  it('puts a rejected technician back in the queue after they fix their profile', async () => {
    await saveProfile(goodProfile);
    await TechnicianProfileModel.updateOne(
      {},
      { approvalStatus: 'rejected', rejectionReason: 'NID photo is blurry' },
    );

    const res = await saveProfile(goodProfile);

    expect(res.body.data.profile.approvalStatus).toBe('pending');
    expect(res.body.data.profile.rejectionReason).toBeUndefined();
  });

  it('rounds the map point to about 10 cm', async () => {
    const res = await saveProfile({
      ...goodProfile,
      location: { lat: 23.818299999999997, lng: 90.36540012345 },
    });

    expect(res.body.data.profile.location.coordinates).toEqual([90.3654, 23.8183]);
  });

  it('accepts several services with skills for each', async () => {
    const res = await saveProfile({
      ...goodProfile,
      serviceIds: ['electrician', 'ac-repair'],
      skillIds: ['fan', 'ac-service'],
    });

    expect(res.status).toBe(200);
  });

  it('refuses a service we do not offer', async () => {
    const res = await saveProfile({ ...goodProfile, serviceIds: ['mechanic'] });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([
      { field: 'serviceIds', message: "We don't offer this service: mechanic" },
    ]);
  });

  it('refuses a service the admin has switched off', async () => {
    await ServiceModel.updateOne({ _id: 'electrician' }, { active: false });
    const res = await saveProfile(goodProfile);

    expect(fieldsOf(res)).toEqual(['serviceIds']);
  });

  it("refuses skills that don't belong to the chosen services", async () => {
    const res = await saveProfile({ ...goodProfile, skillIds: ['fan', 'tap-repair'] });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0]).toEqual({
      field: 'skillIds',
      message: "These skills don't belong to the services you chose: tap-repair",
    });
  });

  it('needs at least one skill for every chosen service', async () => {
    const res = await saveProfile({
      ...goodProfile,
      serviceIds: ['electrician', 'plumber'],
      skillIds: ['fan'],
    });

    expect(res.body.error.details[0].message).toBe('Choose at least one skill for Plumber');
  });

  it('only accepts locations inside Dhaka', async () => {
    // Chattogram
    const res = await saveProfile({ ...goodProfile, location: { lat: 22.3569, lng: 91.7832 } });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toContainEqual({
      field: 'location',
      message: 'Pick a location inside Dhaka',
    });
  });

  it('only allows 5, 10 or 15 km travel distance', async () => {
    expect((await saveProfile({ ...goodProfile, serviceRadiusKm: 15 })).status).toBe(200);

    const res = await saveProfile({ ...goodProfile, serviceRadiusKm: 12 });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toContainEqual({
      field: 'serviceRadiusKm',
      message: 'Choose 5, 10 or 15 km',
    });
  });

  it('checks working days and hours', async () => {
    const res = await saveProfile({
      ...goodProfile,
      workingDays: [1, 1, 9],
      workingHours: { start: '20:00', end: '09:00' },
    });

    expect(res.status).toBe(400);
    expect(fieldsOf(res)).toEqual(expect.arrayContaining(['workingDays.2', 'workingHours.end']));
  });

  it('lists every missing field', async () => {
    const res = await saveProfile({});

    expect(fieldsOf(res).sort()).toEqual(
      [
        'areaName',
        'experienceYears',
        'location',
        'serviceIds',
        'skillIds',
        'workingDays',
        'workingHours',
      ].sort(),
    );
  });

  it('is only for technicians', async () => {
    const customer = await makeUser('customer', '01810000001');

    expect((await getProfile(customer.token)).status).toBe(403);
    expect((await saveProfile(goodProfile, customer.token)).status).toBe(403);
    expect((await request(app).get('/api/v1/technicians/me/profile')).status).toBe(401);
  });
});

describe('PATCH /technicians/me/availability', () => {
  it('needs a profile first', async () => {
    const res = await setAvailability({ acceptingJobs: false });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PROFILE_NOT_FOUND');
  });

  it('turns accepting jobs off and on', async () => {
    await saveProfile(goodProfile);

    expect((await setAvailability({ acceptingJobs: false })).body.data.profile.acceptingJobs).toBe(
      false,
    );
    expect((await setAvailability({ acceptingJobs: true })).body.data.profile.acceptingJobs).toBe(
      true,
    );
  });

  it('needs a true or false value', async () => {
    await saveProfile(goodProfile);
    const res = await setAvailability({ acceptingJobs: 'maybe' });

    expect(res.status).toBe(400);
  });
});
