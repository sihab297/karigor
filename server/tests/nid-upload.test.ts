import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { ServiceModel } from '../src/models/service.model';
import { TechnicianProfileModel } from '../src/models/technician-profile.model';
import { UserModel, type UserRole } from '../src/models/user.model';
import { catalogDocs } from '../src/seed/seed-data';
import { nidPhotoLink, uploadNidPhoto } from '../src/services/nid-storage';
import { createToken } from '../src/utils/jwt';
import { useTestDatabase } from './helpers/test-db';

// stand-in for Cloudinary, so tests never upload real photos
vi.mock('../src/services/nid-storage', () => ({
  uploadNidPhoto: vi.fn(async (_photo: Buffer, userId: string) => `karigor/nid/${userId}`),
  nidPhotoLink: vi.fn((publicId: string) => ({
    url: `https://api.cloudinary.com/download?public_id=${publicId}&signature=abc`,
    expiresAt: '2026-10-12T10:05:00.000Z',
  })),
}));

useTestDatabase();

const app = createApp();

const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200)]);
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(200),
]);

let technician: { id: string; token: string };
let admin: { id: string; token: string };
let phone = 0;

async function makeUser(role: UserRole) {
  const user = await UserModel.create({
    name: `Test ${role}`,
    phone: `0171000000${phone++}`,
    passwordHash: 'x',
    role,
  });
  return { id: user.id as string, token: createToken(user.id, role) };
}

async function makeProfile(userId: string, extra: object = {}) {
  await TechnicianProfileModel.create({
    userId,
    serviceIds: ['electrician'],
    skillIds: ['fan'],
    areaName: 'Mirpur',
    location: { type: 'Point', coordinates: [90.3654, 23.8223] },
    workingDays: [1, 2, 3],
    workingHours: { start: '09:00', end: '18:00' },
    experienceYears: 3,
    ...extra,
  });
}

const upload = (
  file: Buffer,
  filename = 'nid.jpg',
  contentType = 'image/jpeg',
  token = technician.token,
) =>
  request(app)
    .post('/api/v1/technicians/me/nid')
    .set('Authorization', `Bearer ${token}`)
    .attach('photo', file, { filename, contentType });

const nidLink = (userId: string, token = admin.token) =>
  request(app)
    .get(`/api/v1/admin/technicians/${userId}/nid`)
    .set('Authorization', `Bearer ${token}`);

beforeEach(async () => {
  phone = 0;
  vi.clearAllMocks();
  await ServiceModel.insertMany(catalogDocs().services);
  technician = await makeUser('technician');
  admin = await makeUser('admin');
});

describe('POST /technicians/me/nid', () => {
  it('saves a JPG photo privately and says it is there', async () => {
    await makeProfile(technician.id);
    const res = await upload(jpg);

    expect(res.status).toBe(200);
    expect(res.body.data.profile.hasNidPhoto).toBe(true);
    expect(res.body.data.profile.nidPhotoPublicId).toBeUndefined();
    expect(uploadNidPhoto).toHaveBeenCalledWith(expect.any(Buffer), technician.id);

    const saved = await TechnicianProfileModel.findOne({ userId: technician.id });
    expect(saved!.nidPhotoPublicId).toBe(`karigor/nid/${technician.id}`);
  });

  it('accepts PNG photos too', async () => {
    await makeProfile(technician.id);

    expect((await upload(png, 'nid.png', 'image/png')).status).toBe(200);
  });

  it('needs a profile first', async () => {
    const res = await upload(jpg);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PROFILE_NOT_FOUND');
    expect(uploadNidPhoto).not.toHaveBeenCalled();
  });

  it('refuses files that are not photos', async () => {
    await makeProfile(technician.id);
    const res = await upload(Buffer.from('just some text'), 'notes.txt', 'text/plain');

    expect(res.status).toBe(400);
    expect(res.body.error).toEqual({ code: 'WRONG_FILE_TYPE', message: 'Use a JPG or PNG photo.' });
  });

  it('checks the real file, not just its name', async () => {
    await makeProfile(technician.id);
    const fakeJpg = Buffer.from('GIF89a this is really a gif');
    const res = await upload(fakeJpg, 'nid.jpg', 'image/jpeg');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('WRONG_FILE_TYPE');
    expect(uploadNidPhoto).not.toHaveBeenCalled();
  });

  it('refuses photos bigger than 5 MB', async () => {
    await makeProfile(technician.id);
    const big = Buffer.concat([jpg, Buffer.alloc(5 * 1024 * 1024)]);
    const res = await upload(big);

    expect(res.status).toBe(400);
    expect(res.body.error).toEqual({
      code: 'FILE_TOO_LARGE',
      message: 'The photo must be 5 MB or smaller.',
    });
  });

  it('asks for a photo when none is sent', async () => {
    await makeProfile(technician.id);
    const res = await request(app)
      .post('/api/v1/technicians/me/nid')
      .set('Authorization', `Bearer ${technician.token}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('NO_PHOTO');
  });

  it('puts a rejected technician back in the queue after a new photo', async () => {
    await makeProfile(technician.id, {
      approvalStatus: 'rejected',
      rejectionReason: 'NID photo is blurry',
    });
    const res = await upload(jpg);

    expect(res.body.data.profile.approvalStatus).toBe('pending');
    expect(res.body.data.profile.rejectionReason).toBeUndefined();
  });

  it('is only for logged-in technicians', async () => {
    const customer = await makeUser('customer');

    expect((await upload(jpg, 'nid.jpg', 'image/jpeg', customer.token)).status).toBe(403);
    const anonymous = await request(app)
      .post('/api/v1/technicians/me/nid')
      .attach('photo', jpg, { filename: 'nid.jpg', contentType: 'image/jpeg' });
    expect(anonymous.status).toBe(401);
  });
});

describe('GET /admin/technicians/:userId/nid', () => {
  it('gives the admin a short-lived link', async () => {
    await makeProfile(technician.id, { nidPhotoPublicId: `karigor/nid/${technician.id}` });
    const res = await nidLink(technician.id);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      url: expect.stringContaining('signature='),
      expiresAt: '2026-10-12T10:05:00.000Z',
    });
    expect(nidPhotoLink).toHaveBeenCalledWith(`karigor/nid/${technician.id}`);
  });

  it('says when there is no photo yet', async () => {
    await makeProfile(technician.id);

    const res = await nidLink(technician.id);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NID_NOT_FOUND');
    expect((await nidLink('not-an-id')).status).toBe(404);
  });

  it('is only for the admin', async () => {
    await makeProfile(technician.id, { nidPhotoPublicId: `karigor/nid/${technician.id}` });

    expect((await nidLink(technician.id, technician.token)).status).toBe(403);
    expect(nidPhotoLink).not.toHaveBeenCalled();
  });
});
