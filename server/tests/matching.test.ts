import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
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
// one degree of latitude is about 111.32 km
const kmNorth = (km: number) => ({
  type: 'Point',
  coordinates: [home.lng, home.lat + km / 111.32],
});

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

async function makeTechnician(
  name: string,
  {
    km = 1,
    blocked = false,
    ...profile
  }: Record<string, unknown> & { km?: number; blocked?: boolean } = {},
) {
  const user = await makeUser('technician', name, blocked ? 'blocked' : 'active');
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
    ...profile,
  }).save();
  return user;
}

const aiResult = (extra: object = {}) => ({
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
  estimate: null,
  matchesChosenService: true,
  followUpQuestion: null,
  model: 'mock',
  latencyMs: 1,
  ...extra,
});

async function makeReport(extra: object = {}) {
  const report = await new ProblemReportModel({
    customerId: customer.id,
    mode: 'describe',
    text: 'kitchen tap leaking',
    ai: aiResult(),
    ...extra,
  }).save();
  return report.id as string;
}

const findMatches = (id: string, body: object, token = customer.token) =>
  request(app)
    .post(`/api/v1/problems/${id}/matches`)
    .set('Authorization', `Bearer ${token}`)
    .send(body);

const names = (res: request.Response) =>
  res.body.data.matches.map((m: { name: string }) => m.name).sort();

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

describe('POST /api/v1/problems/:id/matches', () => {
  it('keeps only technicians who can do the job at that time and place', async () => {
    await makeTechnician('Rahim Uddin', { km: 1 });
    await makeTechnician('Karim Mia', { km: 2, skillIds: ['pipe-leak'] });
    await makeTechnician('Nadia Akter', { km: 3 });
    await makeTechnician('Too Far', { km: 12 });
    await makeTechnician('Short Trips', { km: 7, serviceRadiusKm: 5 });
    await makeTechnician('Not Approved', { approvalStatus: 'pending' });
    await makeTechnician('On A Break', { acceptingJobs: false });
    await makeTechnician('Blocked Person', { blocked: true });
    await makeTechnician('Only Electrician', { serviceIds: ['electrician'], skillIds: ['fan'] });
    await makeTechnician('Sunday Off', { workingDays: [1, 2, 3] });
    await makeTechnician('Evening Shift', { workingHours: { start: '14:00', end: '22:00' } });
    const id = await makeReport();

    const res = await findMatches(id, { location: home, when: SUNDAY_10AM });

    expect(res.status).toBe(200);
    expect(names(res)).toEqual(['Karim Mia', 'Nadia Akter', 'Rahim Uddin']);
  });

  it('ranks them and shows the facts behind each one', async () => {
    const rahim = await makeTechnician('Rahim Uddin', {
      km: 1,
      ratingAvg: 4.6,
      ratingCount: 14,
      jobsDone: { plumber: 18 },
    });
    await makeTechnician('Karim Mia', {
      km: 2,
      skillIds: ['pipe-leak'],
      ratingAvg: 4.9,
      ratingCount: 40,
      jobsDone: { plumber: 30 },
    });
    await makeTechnician('Nadia Akter', { km: 3, ratingAvg: 0, ratingCount: 0, jobsDone: {} });
    const id = await makeReport();

    const res = await findMatches(id, { location: home, when: SUNDAY_10AM });

    expect(res.body.data).toMatchObject({
      serviceId: 'plumber',
      serviceName: 'Plumber',
      emergency: false,
      when: '2026-10-18T04:00:00.000Z',
      searchedKm: 10,
    });
    const [first, second, third] = res.body.data.matches;
    expect(first).toEqual({
      technicianId: rahim.id,
      name: 'Rahim Uddin',
      areaName: 'Mirpur',
      distanceKm: 1,
      rating: 4.6,
      ratingCount: 14,
      jobsDone: 18,
      experienceYears: 5,
      matchedSkills: [{ id: 'tap-repair', name: 'Tap and faucet repair' }],
      bestMatch: true,
    });
    // a new technician with the right skill beats a top-rated one without it
    expect(second).toMatchObject({
      name: 'Nadia Akter',
      rating: null,
      ratingCount: 0,
      jobsDone: 0,
    });
    expect(third).toMatchObject({ name: 'Karim Mia', matchedSkills: [], bestMatch: false });
    expect(first.score).toBeUndefined();
  });

  it('looks only 5 km away, for people free right now, in an emergency', async () => {
    await makeTechnician('Close By', { km: 3 });
    await makeTechnician('Too Far For Now', { km: 7 });
    await makeTechnician('Starts Later', { km: 2, workingHours: { start: '14:00', end: '20:00' } });
    const id = await makeReport({ ai: aiResult({ urgency: 'emergency' }) });

    const res = await findMatches(id, { location: home });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ emergency: true, searchedKm: 5 });
    expect(new Date(res.body.data.when).getTime() - NOW.getTime()).toBeLessThan(60_000);
    expect(names(res)).toEqual(['Close By']);
  });

  it('does a normal search when an emergency is booked for later', async () => {
    await makeTechnician('Seven Km Away', { km: 7 });
    const id = await makeReport({ ai: aiResult({ urgency: 'emergency' }) });

    const res = await findMatches(id, { location: home, when: SUNDAY_10AM });

    expect(res.body.data).toMatchObject({
      emergency: false,
      searchedKm: 10,
      when: '2026-10-18T04:00:00.000Z',
    });
    expect(names(res)).toEqual(['Seven Km Away']);
  });

  it('uses the service the customer chose instead of the AI', async () => {
    await makeTechnician('Plumber Person', { km: 1 });
    await makeTechnician('Electric Person', {
      km: 2,
      serviceIds: ['electrician'],
      skillIds: ['fan'],
    });
    const id = await makeReport({ finalServiceId: 'electrician' });

    const res = await findMatches(id, { location: home, when: SUNDAY_10AM });

    expect(res.body.data.serviceId).toBe('electrician');
    expect(res.body.data.matches).toEqual([
      expect.objectContaining({ name: 'Electric Person', matchedSkills: [] }),
    ]);
  });

  it('uses the quick path service when the AI could not help', async () => {
    await makeTechnician('Plumber Person', { km: 1 });
    const id = await makeReport({ mode: 'quick', chosenServiceId: 'plumber', ai: null });

    const res = await findMatches(id, { location: home, when: SUNDAY_10AM });

    expect(names(res)).toEqual(['Plumber Person']);
  });

  it('asks for a service first when there is none', async () => {
    const id = await makeReport({ ai: null, aiError: 'AI_FAILED' });

    const res = await findMatches(id, { location: home, when: SUNDAY_10AM });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CHOOSE_SERVICE');
  });

  it('gives an empty list when nobody is free', async () => {
    const id = await makeReport();

    const res = await findMatches(id, { location: home, when: SUNDAY_10AM });

    expect(res.status).toBe(200);
    expect(res.body.data.matches).toEqual([]);
  });

  it.each([
    [undefined, 'Choose a date and time'],
    ['next sunday', 'Choose a date and time'],
    ['2026-10-16T10:00:00+06:00', 'Choose a time from now on'],
    ['2026-11-30T10:00:00+06:00', 'Choose a time in the next 30 days'],
  ])('checks the time (%s)', async (when, message) => {
    const id = await makeReport();

    const res = await findMatches(id, { location: home, when });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([{ field: 'when', message }]);
  });

  it.each([
    [undefined, 'Pin your home on the map'],
    [{ lat: 22.3569, lng: 91.7832 }, 'Pick a location inside Dhaka'],
  ])('needs a pin inside Dhaka', async (location, message) => {
    const id = await makeReport();

    const res = await findMatches(id, { location, when: SUNDAY_10AM });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([{ field: 'location', message }]);
  });

  it('is only for the customer who sent the problem', async () => {
    const id = await makeReport();
    const otherCustomer = await makeUser('customer');
    const technician = await makeUser('technician');

    expect((await findMatches(id, { location: home }, otherCustomer.token)).status).toBe(404);
    expect((await findMatches(id, { location: home }, technician.token)).status).toBe(403);
  });
});
