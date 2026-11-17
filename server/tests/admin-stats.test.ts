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

// Tuesday 17 November 2026, 10:00 in Dhaka
const NOW = new Date('2026-11-17T04:00:00Z');

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

async function makeProfile(userId: string, approvalStatus: string, acceptingJobs = true) {
  await new TechnicianProfileModel({
    userId,
    serviceIds: ['plumber'],
    skillIds: ['tap-repair'],
    areaName: 'Mirpur',
    location: { type: 'Point', coordinates: [90.3654, 23.8223] },
    serviceRadiusKm: 10,
    workingDays: [0, 1, 2],
    workingHours: { start: '09:00', end: '20:00' },
    experienceYears: 3,
    approvalStatus,
    acceptingJobs,
  }).save();
}

// a booking made at a given moment (createdAt is set straight in the database)
async function makeBooking(
  customerId: string,
  technicianId: string,
  createdAt: Date,
  extra: { status?: string; serviceId?: string; emergency?: boolean } = {},
) {
  const report = await ProblemReportModel.create({ customerId, mode: 'describe', text: 'x' });
  const booking = await new BookingModel({
    customerId,
    technicianId,
    problemReportId: report.id,
    serviceId: extra.serviceId ?? 'plumber',
    scheduledAt: createdAt,
    location: { type: 'Point', coordinates: [90.3654, 23.8223] },
    addressText: 'House 12, Road 5',
    status: extra.status ?? 'requested',
    emergency: extra.emergency ?? false,
  }).save();
  await BookingModel.collection.updateOne({ _id: booking._id }, { $set: { createdAt } });
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
  vi.setSystemTime(NOW);
  phone = 0;
  await ServiceModel.insertMany(catalogDocs().services);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GET /api/v1/admin/stats', () => {
  it('counts users, technicians and bookings for today and this month in Dhaka time', async () => {
    const admin = await makeUser('admin');
    const customer = await makeUser('customer');
    await makeUser('customer');
    const t1 = await makeUser('technician');
    const t2 = await makeUser('technician');
    const t3 = await makeUser('technician');
    await makeProfile(t1.id, 'approved');
    await makeProfile(t2.id, 'approved', false);
    await makeProfile(t3.id, 'pending');

    // today in Dhaka (00:30 on 17 Nov in Dhaka is still 16 Nov in UTC)
    await makeBooking(customer.id, t1.id, new Date('2026-11-16T18:30:00Z'), { emergency: true });
    await makeBooking(customer.id, t1.id, new Date('2026-11-17T03:00:00Z'), {
      status: 'completed',
      serviceId: 'electrician',
    });
    // earlier this month
    await makeBooking(customer.id, t1.id, new Date('2026-11-05T06:00:00Z'), {
      status: 'completed',
    });
    // last month: not counted
    await makeBooking(customer.id, t1.id, new Date('2026-10-20T06:00:00Z'), {
      status: 'cancelled',
    });

    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    const stats = res.body.data;
    expect(stats.users).toEqual({ customers: 2, newCustomersThisWeek: 2, technicians: 3 });
    expect(stats.technicians).toEqual({ waiting: 1, approved: 2, rejected: 0, takingJobs: 1 });
    expect(stats.bookings.today).toBe(2);
    expect(stats.bookings.emergenciesToday).toBe(1);
    const byStatus = Object.fromEntries(
      stats.bookings.thisMonthByStatus.map((s: { status: string; count: number }) => [
        s.status,
        s.count,
      ]),
    );
    expect(byStatus).toMatchObject({ requested: 1, completed: 2, cancelled: 0 });
    expect(stats.bookings.thisMonthByStatus).toHaveLength(7);
    expect(stats.bookings.thisMonthByService[0]).toEqual({
      serviceId: 'plumber',
      serviceName: 'Plumber',
      count: 2,
    });
    expect(stats.bookings.thisMonthByService).toHaveLength(7);
  });

  it('is only for the admin', async () => {
    const customer = await makeUser('customer');
    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${customer.token}`);
    expect(res.status).toBe(403);
  });
});
