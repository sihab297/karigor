import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { BookingModel } from '../src/models/booking.model';
import { ProblemReportModel } from '../src/models/problem-report.model';
import { ReviewModel } from '../src/models/review.model';
import { TechnicianProfileModel } from '../src/models/technician-profile.model';
import { UserModel, type UserRole } from '../src/models/user.model';
import { createToken } from '../src/utils/jwt';
import { useTestDatabase } from './helpers/test-db';

useTestDatabase();

const app = createApp();

type TestUser = { id: string; token: string };
let customer: TestUser;
let technician: TestUser;
let phone = 0;

async function makeUser(role: UserRole) {
  const user = await UserModel.create({
    name: `Test ${role}`,
    phone: `0170000${String(phone++).padStart(4, '0')}`,
    passwordHash: 'x',
    role,
  });
  return { id: user.id as string, token: createToken(user.id, role) };
}

async function makeBooking(status = 'completed') {
  const report = await ProblemReportModel.create({
    customerId: customer.id,
    mode: 'describe',
    text: 'tap leaking',
  });
  const booking = await new BookingModel({
    customerId: customer.id,
    technicianId: technician.id,
    problemReportId: report.id,
    serviceId: 'plumber',
    scheduledAt: new Date(),
    location: { type: 'Point', coordinates: [90.3654, 23.8223] },
    addressText: 'House 12, Road 5',
    status,
    finalPrice: status === 'completed' ? 450 : undefined,
    statusHistory: [{ status: 'requested', at: new Date(), byUserId: customer.id }],
  }).save();
  return booking.id as string;
}

const review = (bookingId: string, body: object, token = customer.token) =>
  request(app)
    .post(`/api/v1/bookings/${bookingId}/review`)
    .set('Authorization', `Bearer ${token}`)
    .send(body);

const profile = () => TechnicianProfileModel.findOne({ userId: technician.id });

beforeEach(async () => {
  phone = 0;
  customer = await makeUser('customer');
  technician = await makeUser('technician');
  await new TechnicianProfileModel({
    userId: technician.id,
    serviceIds: ['plumber'],
    skillIds: ['tap-repair'],
    areaName: 'Mirpur',
    location: { type: 'Point', coordinates: [90.3654, 23.8223] },
    serviceRadiusKm: 10,
    workingDays: [0, 1, 2, 3, 4, 6],
    workingHours: { start: '09:00', end: '20:00' },
    experienceYears: 5,
    approvalStatus: 'approved',
    ratingAvg: 4.5,
    ratingCount: 10,
  }).save();
});

describe('POST /api/v1/bookings/:id/review', () => {
  it('saves the review and updates the average rating', async () => {
    const bookingId = await makeBooking();

    const res = await review(bookingId, { rating: 5, comment: '  Quick and tidy work  ' });

    expect(res.status).toBe(201);
    expect(res.body.data.review).toMatchObject({
      rating: 5,
      comment: 'Quick and tidy work',
      serviceId: 'plumber',
    });
    // (4.5 × 10 + 5) ÷ 11 = 4.545…
    const after = await profile();
    expect(after!.ratingCount).toBe(11);
    expect(after!.ratingAvg).toBe(4.55);

    const page = await request(app)
      .get(`/api/v1/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${customer.token}`);
    expect(page.body.data.booking.review).toMatchObject({ rating: 5 });
    expect(page.body.data.booking.canReview).toBe(false);
  });

  it('allows only one review per job', async () => {
    const bookingId = await makeBooking();

    expect((await review(bookingId, { rating: 4 })).status).toBe(201);
    const again = await review(bookingId, { rating: 1 });

    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('ALREADY_REVIEWED');
    expect(await ReviewModel.countDocuments()).toBe(1);
    expect((await profile())!.ratingCount).toBe(11);
  });

  it('waits until the job is done', async () => {
    const bookingId = await makeBooking('arrived');

    const res = await review(bookingId, { rating: 5 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('REVIEW_NOT_ALLOWED');
    const page = await request(app)
      .get(`/api/v1/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${customer.token}`);
    expect(page.body.data.booking.canReview).toBe(false);
  });

  it('offers the review only to the customer of a finished job', async () => {
    const bookingId = await makeBooking();

    const asCustomer = await request(app)
      .get(`/api/v1/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${customer.token}`);
    expect(asCustomer.body.data.booking.canReview).toBe(true);
    expect(asCustomer.body.data.booking.review).toBeNull();

    expect((await review(bookingId, { rating: 5 }, technician.token)).status).toBe(403);
    const stranger = await makeUser('customer');
    expect((await review(bookingId, { rating: 5 }, stranger.token)).status).toBe(404);
  });

  it('checks the stars and the comment', async () => {
    const bookingId = await makeBooking();

    for (const rating of [0, 6, 4.5, 'five']) {
      const res = await review(bookingId, { rating });
      expect(res.status).toBe(400);
      expect(res.body.error.details[0].field).toBe('rating');
    }
    const long = await review(bookingId, { rating: 4, comment: 'x'.repeat(501) });
    expect(long.status).toBe(400);
    expect(long.body.error.details[0].field).toBe('comment');
  });
});
