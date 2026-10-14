import { Types } from 'mongoose';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { PriceItemModel } from '../src/models/price-item.model';
import { ProblemReportModel } from '../src/models/problem-report.model';
import { SafetyTipModel } from '../src/models/safety-tip.model';
import { ServiceModel } from '../src/models/service.model';
import { UserModel, type UserRole } from '../src/models/user.model';
import { catalogDocs } from '../src/seed/seed-data';
import { analyzeWithAi } from '../src/services/ai.service';
import { uploadProblemPhotos } from '../src/services/problem-photos';
import { AppError } from '../src/utils/app-error';
import { createToken } from '../src/utils/jwt';
import { useTestDatabase } from './helpers/test-db';

// stand-in for Cloudinary, so tests never upload real photos
vi.mock('../src/services/problem-photos', () => ({
  uploadProblemPhotos: vi.fn(async (photos: Buffer[]) =>
    photos.map((_photo, i) => `karigor/problems/test-${i}`),
  ),
  problemPhotoUrls: vi.fn((ids: string[]) =>
    ids.map((id) => `https://res.cloudinary.com/demo/image/authenticated/s--sig--/${id}.jpg`),
  ),
}));

// the real mock AI, but a test can make it fail
vi.mock('../src/services/ai.service', async (importOriginal) => {
  const real = await importOriginal<typeof import('../src/services/ai.service')>();
  return { analyzeWithAi: vi.fn(real.analyzeWithAi) };
});

useTestDatabase();

const app = createApp();

const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200)]);
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(200),
]);

type TestUser = { id: string; token: string };
let customer: TestUser;
let otherCustomer: TestUser;
let technician: TestUser;
let admin: TestUser;
let phone = 0;

async function makeUser(role: UserRole): Promise<TestUser> {
  const user = await UserModel.create({
    name: `Test ${role}`,
    phone: `0171000000${phone++}`,
    passwordHash: 'x',
    role,
  });
  return { id: user.id as string, token: createToken(user.id, role) };
}

const analyze = (fields: Record<string, string>, photos: Buffer[] = [], token = customer.token) => {
  const req = request(app).post('/api/v1/problems/analyze').set('Authorization', `Bearer ${token}`);
  for (const [name, value] of Object.entries(fields)) req.field(name, value);
  photos.forEach((photo, i) =>
    req.attach('photos', photo, { filename: `photo-${i}.jpg`, contentType: 'image/jpeg' }),
  );
  return req;
};

const getProblem = (id: string, token = customer.token) =>
  request(app).get(`/api/v1/problems/${id}`).set('Authorization', `Bearer ${token}`);

const changeService = (id: string, body: object, token = customer.token) =>
  request(app).patch(`/api/v1/problems/${id}`).set('Authorization', `Bearer ${token}`).send(body);

async function oldReports(customerId: string, count: number, minutesAgo: number) {
  const createdAt = new Date(Date.now() - minutesAgo * 60_000);
  await ProblemReportModel.collection.insertMany(
    Array.from({ length: count }, () => ({
      customerId: new Types.ObjectId(customerId),
      mode: 'describe',
      text: 'old check',
      photoIds: [],
      ai: null,
      createdAt,
      updatedAt: createdAt,
    })),
  );
}

beforeEach(async () => {
  phone = 0;
  vi.clearAllMocks();
  const catalog = catalogDocs();
  await ServiceModel.insertMany(catalog.services);
  await PriceItemModel.insertMany(catalog.priceItems);
  await SafetyTipModel.insertMany(catalog.safetyTips);
  customer = await makeUser('customer');
  otherCustomer = await makeUser('customer');
  technician = await makeUser('technician');
  admin = await makeUser('admin');
});

describe('POST /api/v1/problems/analyze', () => {
  it('checks a written problem and saves the result', async () => {
    const res = await analyze({ text: '3ta tap change korte hobe' });

    expect(res.status).toBe(201);
    const { report } = res.body.data;
    expect(report).toMatchObject({
      customerId: customer.id,
      mode: 'describe',
      text: '3ta tap change korte hobe',
      photoUrls: [],
      ai: {
        understood: true,
        serviceId: 'plumber',
        model: 'mock',
        priceLines: [expect.objectContaining({ priceItemId: 'plumber-tap', quantity: 3 })],
      },
    });
    expect(report.photoIds).toBeUndefined();
    expect(await ProblemReportModel.countDocuments({ customerId: customer.id })).toBe(1);
  });

  it('uses the prices in the database, so admin changes count straight away', async () => {
    await PriceItemModel.updateOne({ _id: 'plumber-tap' }, { minPrice: 250, maxPrice: 450 });
    const res = await analyze({ text: '3ta tap change korte hobe' });

    expect(res.body.data.report.ai.estimate).toEqual({ min: 750, max: 1350 });
  });

  it('keeps the chosen service on the quick path', async () => {
    const res = await analyze({ text: 'IPS not working', chosenServiceId: 'electrician' });

    expect(res.status).toBe(201);
    expect(res.body.data.report).toMatchObject({
      mode: 'quick',
      chosenServiceId: 'electrician',
      ai: { serviceId: 'electrician', matchesChosenService: true },
    });
  });

  it('stores the photos privately and sends them to the AI', async () => {
    const res = await analyze({ text: 'pipe leak' }, [jpg, png]);

    expect(res.status).toBe(201);
    expect(uploadProblemPhotos).toHaveBeenCalledWith([jpg, png]);
    expect(res.body.data.report.photoUrls).toEqual([
      expect.stringContaining('karigor/problems/test-0'),
      expect.stringContaining('karigor/problems/test-1'),
    ]);
    expect(analyzeWithAi).toHaveBeenCalledWith(
      expect.objectContaining({
        images: [
          { mimeType: 'image/jpeg', base64: jpg.toString('base64') },
          { mimeType: 'image/png', base64: png.toString('base64') },
        ],
      }),
      expect.anything(),
    );
  });

  it('accepts a photo without any text', async () => {
    const res = await analyze({}, [jpg]);

    expect(res.status).toBe(201);
    expect(res.body.data.report.text).toBe('');
  });

  it('asks for text or a photo', async () => {
    const res = await analyze({ text: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([
      { field: 'text', message: 'Tell us the problem or add a photo' },
    ]);
  });

  it('asks for a little more than two letters', async () => {
    const res = await analyze({ text: 'ab' });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('text');
  });

  it('refuses a service we do not offer', async () => {
    const res = await analyze({ text: 'fix my car', chosenServiceId: 'mechanic' }, [jpg]);

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('chosenServiceId');
    expect(uploadProblemPhotos).not.toHaveBeenCalled();
    expect(analyzeWithAi).not.toHaveBeenCalled();
  });

  it('refuses a file that is not really a photo', async () => {
    const res = await analyze({ text: 'pipe leak' }, [Buffer.from('not a photo at all')]);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('WRONG_FILE_TYPE');
    expect(uploadProblemPhotos).not.toHaveBeenCalled();
  });

  it('takes at most 3 photos', async () => {
    const res = await analyze({ text: 'pipe leak' }, [jpg, jpg, jpg, jpg]);

    expect(res.status).toBe(400);
    expect(res.body.error).toEqual({ code: 'TOO_MANY_FILES', message: 'Send up to 3 photos.' });
  });

  it('refuses photos bigger than 5 MB', async () => {
    const big = Buffer.concat([jpg, Buffer.alloc(5 * 1024 * 1024)]);
    const res = await analyze({ text: 'pipe leak' }, [big]);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });

  it('still saves the problem when the AI fails, so the customer can choose', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(analyzeWithAi).mockRejectedValueOnce(new Error('Gemini is down'));
    const res = await analyze({ text: 'pipe leak' });

    expect(res.status).toBe(201);
    expect(res.body.data.report).toMatchObject({ ai: null, aiError: 'AI_FAILED' });
    expect(await ProblemReportModel.countDocuments()).toBe(1);
    error.mockRestore();
  });

  it('remembers why the AI could not help', async () => {
    vi.mocked(analyzeWithAi).mockRejectedValueOnce(
      new AppError(503, 'AI_NOT_SET_UP', 'The AI is not set up yet.'),
    );
    const res = await analyze({ text: 'pipe leak' });

    expect(res.body.data.report.aiError).toBe('AI_NOT_SET_UP');
  });

  it('allows 10 checks an hour', async () => {
    await oldReports(customer.id, 10, 50);
    const res = await analyze({ text: 'pipe leak' }, [jpg]);

    expect(res.status).toBe(429);
    expect(res.body.error).toEqual({
      code: 'TOO_MANY_CHECKS',
      message: 'You have checked 10 problems in the last hour. Please try again in 10 min.',
    });
    expect(uploadProblemPhotos).not.toHaveBeenCalled();
    expect(analyzeWithAi).not.toHaveBeenCalled();
  });

  it('does not count older checks or other customers', async () => {
    await oldReports(customer.id, 10, 61);
    await oldReports(otherCustomer.id, 10, 5);
    const res = await analyze({ text: 'pipe leak' });

    expect(res.status).toBe(201);
  });

  it('is only for customers', async () => {
    const noLogin = await request(app).post('/api/v1/problems/analyze').field('text', 'pipe leak');
    const asTechnician = await analyze({ text: 'pipe leak' }, [], technician.token);

    expect(noLogin.status).toBe(401);
    expect(asTechnician.status).toBe(403);
  });
});

describe('GET /api/v1/problems/:id', () => {
  it('shows the customer their own problem with photo links', async () => {
    const created = await analyze({ text: 'pipe leak' }, [jpg]);
    const res = await getProblem(created.body.data.report.id);

    expect(res.status).toBe(200);
    expect(res.body.data.report).toMatchObject({
      id: created.body.data.report.id,
      photoUrls: [expect.stringContaining('karigor/problems/test-0')],
    });
  });

  it('lets the admin see it too', async () => {
    const created = await analyze({ text: 'pipe leak' });
    const res = await getProblem(created.body.data.report.id, admin.token);

    expect(res.status).toBe(200);
  });

  it("hides other customers' problems", async () => {
    const created = await analyze({ text: 'pipe leak' });
    const res = await getProblem(created.body.data.report.id, otherCustomer.token);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PROBLEM_NOT_FOUND');
  });

  it('says not found for a broken id', async () => {
    const res = await getProblem('not-an-id');

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/v1/problems/:id', () => {
  it('lets the customer pick a different service', async () => {
    const created = await analyze({ text: 'AC theke pani porche' });
    const res = await changeService(created.body.data.report.id, { finalServiceId: 'plumber' });

    expect(res.status).toBe(200);
    expect(res.body.data.report).toMatchObject({
      finalServiceId: 'plumber',
      ai: { serviceId: 'ac-repair' },
    });
  });

  it('refuses a service we do not offer', async () => {
    const created = await analyze({ text: 'pipe leak' });
    const res = await changeService(created.body.data.report.id, { finalServiceId: 'mechanic' });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('finalServiceId');
  });

  it('asks which service', async () => {
    const created = await analyze({ text: 'pipe leak' });
    const res = await changeService(created.body.data.report.id, {});

    expect(res.status).toBe(400);
    expect(res.body.error.details[0]).toEqual({
      field: 'finalServiceId',
      message: 'Choose a service',
    });
  });

  it('does not let anyone else change it', async () => {
    const created = await analyze({ text: 'pipe leak' });
    const id = created.body.data.report.id;

    expect(
      (await changeService(id, { finalServiceId: 'plumber' }, otherCustomer.token)).status,
    ).toBe(404);
    expect((await changeService(id, { finalServiceId: 'plumber' }, admin.token)).status).toBe(403);
  });
});
