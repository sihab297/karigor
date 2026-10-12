import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { TechnicianProfileModel } from '../src/models/technician-profile.model';
import { UserModel, type UserRole } from '../src/models/user.model';
import { createToken } from '../src/utils/jwt';
import { useTestDatabase } from './helpers/test-db';

useTestDatabase();

const app = createApp();
let admin: { id: string; token: string };
let phone = 0;

async function makeUser(role: UserRole, name = `Test ${role}`) {
  const user = await UserModel.create({
    name,
    phone: `0171000${String(phone++).padStart(4, '0')}`,
    passwordHash: 'x',
    role,
  });
  return { id: user.id as string, token: createToken(user.id, role) };
}

async function makeTechnician(name: string, extra: object = {}) {
  const user = await makeUser('technician', name);
  await TechnicianProfileModel.create({
    userId: user.id,
    serviceIds: ['plumber'],
    skillIds: ['tap-repair'],
    areaName: 'Lalbagh',
    location: { type: 'Point', coordinates: [90.3882, 23.7189] },
    workingDays: [6, 0, 1],
    workingHours: { start: '09:00', end: '20:00' },
    experienceYears: 3,
    ...extra,
  });
  return user;
}

const list = (query = '', token = admin.token) =>
  request(app).get(`/api/v1/admin/technicians${query}`).set('Authorization', `Bearer ${token}`);
const review = (userId: string, body: object, token = admin.token) =>
  request(app)
    .patch(`/api/v1/admin/technicians/${userId}/approval`)
    .set('Authorization', `Bearer ${token}`)
    .send(body);

beforeEach(async () => {
  phone = 0;
  admin = await makeUser('admin');
});

describe('GET /admin/technicians', () => {
  it('lists waiting technicians, oldest first, with their name and phone', async () => {
    await makeTechnician('Sohel Rana', { nidPhotoPublicId: 'karigor/nid/a' });
    await makeTechnician('Arif Hasan');
    await makeTechnician('Already Approved', { approvalStatus: 'approved' });

    const res = await list();

    expect(res.status).toBe(200);
    const names = res.body.data.technicians.map((t: { user: { name: string } }) => t.user.name);
    expect(names).toEqual(['Sohel Rana', 'Arif Hasan']);
    expect(res.body.data.technicians[0]).toMatchObject({
      areaName: 'Lalbagh',
      serviceIds: ['plumber'],
      hasNidPhoto: true,
      user: { name: 'Sohel Rana', phone: expect.stringMatching(/^0171/) },
    });
    expect(res.body.data.technicians[0].nidPhotoPublicId).toBeUndefined();
    expect(res.body.data.counts).toEqual({ pending: 2, approved: 1, rejected: 0 });
  });

  it('shows the other tabs', async () => {
    await makeTechnician('Approved One', { approvalStatus: 'approved' });

    const res = await list('?status=approved');

    expect(res.body.data.technicians).toHaveLength(1);
    expect(res.body.data.technicians[0].user.name).toBe('Approved One');
  });

  it('refuses an unknown tab', async () => {
    expect((await list('?status=maybe')).status).toBe(400);
  });
});

describe('PATCH /admin/technicians/:id/approval', () => {
  it('approves a technician who has sent their NID photo', async () => {
    const tech = await makeTechnician('Sohel Rana', { nidPhotoPublicId: 'karigor/nid/a' });

    const res = await review(tech.id, { status: 'approved' });

    expect(res.status).toBe(200);
    expect(res.body.data.technician).toMatchObject({
      approvalStatus: 'approved',
      reviewedBy: admin.id,
      user: { name: 'Sohel Rana' },
    });
    expect(res.body.data.technician.reviewedAt).toEqual(expect.any(String));
    expect((await list()).body.data.counts).toEqual({ pending: 0, approved: 1, rejected: 0 });
  });

  it('will not approve without an NID photo', async () => {
    const tech = await makeTechnician('Arif Hasan');

    const res = await review(tech.id, { status: 'approved' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('NID_REQUIRED');
  });

  it('rejects with a reason the technician can read', async () => {
    const tech = await makeTechnician('Arif Hasan');

    const res = await review(tech.id, {
      status: 'rejected',
      reason: 'Please upload a clear photo of your NID.',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.technician).toMatchObject({
      approvalStatus: 'rejected',
      rejectionReason: 'Please upload a clear photo of your NID.',
    });

    const own = await request(app)
      .get('/api/v1/technicians/me/profile')
      .set('Authorization', `Bearer ${tech.token}`);
    expect(own.body.data.profile.rejectionReason).toBe('Please upload a clear photo of your NID.');
  });

  it('needs a real reason to reject', async () => {
    const tech = await makeTechnician('Arif Hasan');

    const res = await review(tech.id, { status: 'rejected', reason: 'no' });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toContainEqual({
      field: 'reason',
      message: 'Tell the technician why, in a few words',
    });
  });

  it('clears the old reason when a rejected technician is approved later', async () => {
    const tech = await makeTechnician('Arif Hasan', {
      approvalStatus: 'rejected',
      rejectionReason: 'Blurry NID',
      nidPhotoPublicId: 'karigor/nid/b',
    });

    const res = await review(tech.id, { status: 'approved' });

    expect(res.body.data.technician.approvalStatus).toBe('approved');
    expect(res.body.data.technician.rejectionReason).toBeUndefined();
  });

  it('says when the technician does not exist', async () => {
    const customer = await makeUser('customer');

    expect((await review(customer.id, { status: 'approved' })).status).toBe(404);
    expect((await review('not-an-id', { status: 'approved' })).status).toBe(404);
  });

  it('needs approve or reject', async () => {
    const tech = await makeTechnician('Arif Hasan');

    expect((await review(tech.id, { status: 'maybe' })).status).toBe(400);
  });

  it('is only for the admin', async () => {
    const tech = await makeTechnician('Sohel Rana', { nidPhotoPublicId: 'karigor/nid/a' });

    expect((await review(tech.id, { status: 'approved' }, tech.token)).status).toBe(403);
    expect((await list('', tech.token)).status).toBe(403);
    expect((await TechnicianProfileModel.findOne({ userId: tech.id }))!.approvalStatus).toBe(
      'pending',
    );
  });
});
