import { BOOKING_STATUSES, BookingModel } from '../models/booking.model';
import { ProblemReportModel } from '../models/problem-report.model';
import { ServiceModel } from '../models/service.model';
import { TechnicianProfileModel } from '../models/technician-profile.model';
import { UserModel } from '../models/user.model';
import { startOfDhakaDay, startOfDhakaMonth } from '../utils/dhaka-time';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// the numbers on the admin dashboard; "today" and "this month" are in Dhaka time
export async function getAdminStats(now = new Date()) {
  const today = startOfDhakaDay(now);
  const month = startOfDhakaMonth(now);
  const weekAgo = new Date(now.getTime() - WEEK_MS);

  const [
    customers,
    newCustomers,
    technicians,
    approval,
    takingJobs,
    bookingsToday,
    emergenciesToday,
    byStatus,
    byService,
    services,
    problemChecks,
  ] = await Promise.all([
    UserModel.countDocuments({ role: 'customer' }),
    UserModel.countDocuments({ role: 'customer', createdAt: { $gte: weekAgo } }),
    UserModel.countDocuments({ role: 'technician' }),
    TechnicianProfileModel.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$approvalStatus', count: { $sum: 1 } } },
    ]),
    TechnicianProfileModel.countDocuments({ approvalStatus: 'approved', acceptingJobs: true }),
    BookingModel.countDocuments({ createdAt: { $gte: today } }),
    BookingModel.countDocuments({ createdAt: { $gte: today }, emergency: true }),
    BookingModel.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: month } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    BookingModel.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: month } } },
      { $group: { _id: '$serviceId', count: { $sum: 1 } } },
    ]),
    ServiceModel.find({}, 'name'),
    ProblemReportModel.countDocuments({ createdAt: { $gte: month } }),
  ]);

  const approvalCount = (status: string) => approval.find((a) => a._id === status)?.count ?? 0;
  const statusCount = new Map(byStatus.map((s) => [s._id, s.count]));
  const serviceCount = new Map(byService.map((s) => [s._id, s.count]));

  return {
    users: { customers, newCustomersThisWeek: newCustomers, technicians },
    technicians: {
      waiting: approvalCount('pending'),
      approved: approvalCount('approved'),
      rejected: approvalCount('rejected'),
      takingJobs,
    },
    bookings: {
      today: bookingsToday,
      emergenciesToday,
      // every status, even with 0, so the chart always has the same rows
      thisMonthByStatus: BOOKING_STATUSES.map((status) => ({
        status,
        count: statusCount.get(status) ?? 0,
      })),
      // every service, most booked first
      thisMonthByService: services
        .map((service) => ({
          serviceId: service.id as string,
          serviceName: service.name,
          count: serviceCount.get(service.id as string) ?? 0,
        }))
        .sort((a, b) => b.count - a.count || a.serviceName.localeCompare(b.serviceName)),
    },
    problemChecksThisMonth: problemChecks,
  };
}
