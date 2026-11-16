import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { BookingModel } from '../src/models/booking.model';
import { ProblemReportModel } from '../src/models/problem-report.model';
import { ServiceModel } from '../src/models/service.model';
import { TechnicianProfileModel } from '../src/models/technician-profile.model';
import { UserModel, type UserRole } from '../src/models/user.model';
import { catalogDocs } from '../src/seed/seed-data';
import { createToken } from '../src/utils/jwt';
import { useTestDatabase } from './helpers/test-db';

useTestDatabase();

const app = createApp();

// Saturday 17 October 2026, 10:00 in Dhaka
const NOW = new Date('2026-10-17T04:00:00Z');
const SUNDAY_10AM = '2026-10-18T10:00:00+06:00';

const home = { lat: 23.8223, lng: 90.3654 };
const kmNorth = (km: number) => ({
  type: 'Point',
  coordinates: [home.lng, home.lat + km / 111.32],
});

type TestUser = { id: string; token: string };
let customer: TestUser;
let phone = 0;

async function makeUser(role: UserRole, name = `Test ${role}`) {
  const user = await UserModel.create({
    name,
    phone: `0170000${String(phone++).padStart(4, '0')}`,
    passwordHash: 'x',
    role,
  });
  return { id: user.id as string, token: createToken(user.id, role) };
}

async function makeTechnician(name: string, km = 1) {
  const user = await makeUser('technician', name);
  await new TechnicianProfileModel({
    userId: user.id,
    serviceIds: ['plumber'],
    skillIds: ['tap-repair'],
    areaName: 'Mirpur',
    location: kmNorth(km),
    serviceRadiusKm: 10,
    workingDays: [6, 0, 1, 2, 3, 4],
    workingHours: { start: '09:00', end: '20:00' },
    experienceYears: 5,
    approvalStatus: 'approved',
    ratingAvg: 4.5,
    ratingCount: 10,
    jobsDone: { plumber: 10 },
  }).save();
  return user;
}

async function makeReport(ai: object = {}, extra: object = {}, owner = customer) {
  const report = await new ProblemReportModel({
    customerId: owner.id,
    mode: 'describe',
    text: 'kitchen tap leaking',
    ai: {
      understood: true,
      serviceId: 'plumber',
      serviceName: 'Plumber',
      skillIds: ['tap-repair'],
      summary: 'The kitchen tap is leaking.',
      urgency: 'normal',
      confidence: 'high',
      emergencyType: null,
      safetyTips: [],
      emergencyNumber: null,
      priceLines: [],
      estimate: { min: 400, max: 800 },
      matchesChosenService: true,
      followUpQuestion: null,
      model: 'mock',
      latencyMs: 1,
      ...ai,
    },
    ...extra,
  }).save();
  return report.id as string;
}

const bookingBody = (problemId: string, technicianId: string, extra: object = {}) => ({
  problemId,
  technicianId,
  location: home,
  when: SUNDAY_10AM,
  addressText: 'House 12, Road 5, Flat 3B',
  note: 'Ring the bell twice',
  ...extra,
});

// the faked clock keeps ticking, so "now" is a few milliseconds after NOW
function expectAboutNow(value: string) {
  const diff = new Date(value).getTime() - NOW.getTime();
  expect(diff).toBeGreaterThanOrEqual(0);
  expect(diff).toBeLessThan(5000);
}

const book = (body: object, token = customer.token) =>
  request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${token}`).send(body);

beforeEach(async () => {
  // only the clock is faked; it keeps ticking so the database driver still works
  vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
  vi.setSystemTime(NOW);
  phone = 0;
  await ServiceModel.insertMany(catalogDocs().services);
  customer = await makeUser('customer');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('POST /api/v1/bookings', () => {
  it('books one of the top 3 and saves the request', async () => {
    const rahim = await makeTechnician('Rahim Uddin');
    const problemId = await makeReport();

    const res = await book(bookingBody(problemId, rahim.id));

    expect(res.status).toBe(201);
    expect(res.body.data.technician).toEqual({ id: rahim.id, name: 'Rahim Uddin' });
    const booking = res.body.data.booking;
    expect(booking).toMatchObject({
      customerId: customer.id,
      technicianId: rahim.id,
      problemReportId: problemId,
      serviceId: 'plumber',
      status: 'requested',
      emergency: false,
      addressText: 'House 12, Road 5, Flat 3B',
      note: 'Ring the bell twice',
      estimate: { min: 400, max: 800 },
      location: { type: 'Point', coordinates: [home.lng, home.lat] },
    });
    expect(new Date(booking.scheduledAt).toISOString()).toBe(new Date(SUNDAY_10AM).toISOString());
    expect(booking.statusHistory).toHaveLength(1);
    expect(booking.statusHistory[0]).toMatchObject({ status: 'requested', byUserId: customer.id });
    expectAboutNow(booking.statusHistory[0].at);
    expect(await BookingModel.countDocuments()).toBe(1);
  });

  it('books "right now" for an emergency when no time is sent', async () => {
    const rahim = await makeTechnician('Rahim Uddin');
    const problemId = await makeReport({ urgency: 'emergency', emergencyType: 'gas-leak' });

    const res = await book(bookingBody(problemId, rahim.id, { when: undefined }));

    expect(res.status).toBe(201);
    expect(res.body.data.booking.emergency).toBe(true);
    expectAboutNow(res.body.data.booking.scheduledAt);
  });

  it('does not copy the AI price when the customer chose another service', async () => {
    const rahim = await makeTechnician('Rahim Uddin');
    const problemId = await makeReport(
      { serviceId: 'electrician', serviceName: 'Electrician', skillIds: ['fan'] },
      { finalServiceId: 'plumber' },
    );

    const res = await book(bookingBody(problemId, rahim.id));

    expect(res.status).toBe(201);
    expect(res.body.data.booking.estimate).toBeNull();
  });

  it('refuses a technician who is not in the top 3', async () => {
    await makeTechnician('Near One', 1);
    await makeTechnician('Near Two', 2);
    await makeTechnician('Near Three', 3);
    const fourth = await makeTechnician('Far Fourth', 6);
    const problemId = await makeReport();

    const res = await book(bookingBody(problemId, fourth.id));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('TECHNICIAN_NOT_AVAILABLE');
    expect(await BookingModel.countDocuments()).toBe(0);
  });

  it('refuses a technician who is no longer free at that time', async () => {
    const rahim = await makeTechnician('Rahim Uddin');
    const otherProblem = await makeReport();
    await BookingModel.create({
      ...bookingBody(otherProblem, rahim.id),
      customerId: customer.id,
      problemReportId: otherProblem,
      serviceId: 'plumber',
      scheduledAt: new Date('2026-10-18T11:00:00+06:00'),
      location: { type: 'Point', coordinates: [home.lng, home.lat] },
      status: 'accepted',
    });
    const problemId = await makeReport();

    const res = await book(bookingBody(problemId, rahim.id));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('TECHNICIAN_BUSY');
  });

  it('allows only one open booking per problem, but a new one after a "no"', async () => {
    const rahim = await makeTechnician('Rahim Uddin');
    const kamal = await makeTechnician('Kamal Hossain', 2);
    const problemId = await makeReport();

    expect((await book(bookingBody(problemId, rahim.id))).status).toBe(201);
    const again = await book(bookingBody(problemId, kamal.id));
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('ALREADY_BOOKED');

    await BookingModel.updateOne({ technicianId: rahim.id }, { status: 'rejected' });
    expect((await book(bookingBody(problemId, kamal.id))).status).toBe(201);
  });

  it('checks the address and the time', async () => {
    const rahim = await makeTechnician('Rahim Uddin');
    const problemId = await makeReport();

    const res = await book(
      bookingBody(problemId, rahim.id, { addressText: ' ', when: '2026-10-16T10:00:00+06:00' }),
    );
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toContain('addressText');

    const past = await book(
      bookingBody(problemId, rahim.id, { when: '2026-10-16T10:00:00+06:00' }),
    );
    expect(past.status).toBe(400);
    expect(past.body.error.details[0].field).toBe('when');
  });

  it("can't book someone else's problem, and only customers can book", async () => {
    const rahim = await makeTechnician('Rahim Uddin');
    const other = await makeUser('customer', 'Other Customer');
    const othersProblem = await makeReport({}, {}, other);

    const res = await book(bookingBody(othersProblem, rahim.id));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PROBLEM_NOT_FOUND');

    const asTechnician = await book(bookingBody(othersProblem, rahim.id), rahim.token);
    expect(asTechnician.status).toBe(403);
  });
});
