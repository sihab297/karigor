import type { Types } from 'mongoose';
import type { BookingDocument, BookingStatus } from '../models/booking.model';
import { ProblemReportModel } from '../models/problem-report.model';
import { ServiceModel } from '../models/service.model';
import { TechnicianProfileModel } from '../models/technician-profile.model';
import { UserModel } from '../models/user.model';
import { STATUS_RULES, type BookingSide } from './booking-rules';

export type Viewer = BookingSide | 'admin';

// phone numbers are shared only while the job is going on
const CONTACT_STATUSES: BookingStatus[] = ['accepted', 'on_the_way', 'arrived'];
// the technician sees the house address only after saying yes
const ADDRESS_STATUSES: BookingStatus[] = ['accepted', 'on_the_way', 'arrived', 'completed'];

export function allowedActions(status: BookingStatus, viewer: Viewer): BookingStatus[] {
  if (viewer === 'admin') return [];
  return Object.entries(STATUS_RULES[status] ?? {})
    .filter(([, side]) => side === viewer)
    .map(([to]) => to as BookingStatus);
}

// "Nusrat Jahan" -> "Nusrat J."
function shortName(name: string) {
  const [first = '', ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0]}.` : first;
}

const key = (id: Types.ObjectId) => id.toString();

// what each person in a booking is allowed to see
export async function buildBookingViews(
  bookings: BookingDocument[],
  viewerOf: (booking: BookingDocument) => Viewer,
) {
  const userIds = [...new Set(bookings.flatMap((b) => [key(b.customerId), key(b.technicianId)]))];
  const [users, services, profiles, reports] = await Promise.all([
    UserModel.find({ _id: { $in: userIds } }, 'name phone'),
    ServiceModel.find({ _id: { $in: [...new Set(bookings.map((b) => b.serviceId))] } }, 'name'),
    TechnicianProfileModel.find(
      { userId: { $in: bookings.map((b) => b.technicianId) } },
      'userId ratingAvg ratingCount',
    ),
    ProblemReportModel.find({ _id: { $in: bookings.map((b) => b.problemReportId) } }, 'text ai'),
  ]);
  const userById = new Map(users.map((u) => [key(u._id), u]));
  const serviceName = new Map(services.map((s) => [s.id as string, s.name]));
  const profileByUser = new Map(profiles.map((p) => [key(p.userId), p]));
  const reportById = new Map(reports.map((r) => [key(r._id), r]));

  return bookings.map((booking) => {
    const viewer = viewerOf(booking);
    const status = booking.status as BookingStatus;
    const contact = viewer === 'admin' || CONTACT_STATUSES.includes(status);
    const showAddress = viewer !== 'technician' || ADDRESS_STATUSES.includes(status);
    const technician = userById.get(key(booking.technicianId));
    const customer = userById.get(key(booking.customerId));
    const profile = profileByUser.get(key(booking.technicianId));
    const report = reportById.get(key(booking.problemReportId));
    const [lng = 0, lat = 0] = booking.location.coordinates;

    return {
      id: booking.id as string,
      problemId: key(booking.problemReportId),
      status,
      serviceId: booking.serviceId,
      serviceName: serviceName.get(booking.serviceId) ?? booking.serviceId,
      scheduledAt: booking.scheduledAt,
      emergency: booking.emergency,
      // the map pin only; the exact address is below
      location: { lat, lng },
      addressText: showAddress ? booking.addressText : null,
      note: booking.note,
      estimate: booking.estimate ? { min: booking.estimate.min, max: booking.estimate.max } : null,
      finalPrice: booking.finalPrice ?? null,
      cancelReason: booking.cancelReason ?? null,
      createdAt: booking.get('createdAt') as Date,
      problem: report
        ? {
            text: report.text,
            summary: report.ai?.summary ?? null,
            urgency: report.ai?.urgency ?? null,
          }
        : null,
      technician: {
        id: key(booking.technicianId),
        name: technician?.name ?? 'Karigor',
        phone: contact ? (technician?.phone ?? null) : null,
        rating: profile && profile.ratingCount > 0 ? Math.round(profile.ratingAvg * 10) / 10 : null,
        ratingCount: profile?.ratingCount ?? 0,
      },
      customer: {
        id: key(booking.customerId),
        name:
          viewer === 'technician' && !contact
            ? shortName(customer?.name ?? 'Customer')
            : (customer?.name ?? 'Customer'),
        phone: contact ? (customer?.phone ?? null) : null,
      },
      statusHistory: booking.statusHistory.map((change) => ({
        status: change.status,
        at: change.at,
        by: change.byUserId.equals(booking.customerId) ? 'customer' : 'technician',
      })),
      // what this person can do next, so pages show only the right buttons
      actions: allowedActions(status, viewer),
    };
  });
}

export type BookingView = Awaited<ReturnType<typeof buildBookingViews>>[number];
