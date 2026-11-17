import { isValidObjectId, type Types } from 'mongoose';
import { BookingModel } from '../models/booking.model';
import { UserModel, type UserDocument, type UserStatus } from '../models/user.model';
import { disconnectUser } from '../realtime/socket';
import { AppError } from '../utils/app-error';
import type { AdminBookingsQuery, AdminUsersQuery } from '../validators/admin.validators';
import { buildBookingViews } from './booking-view';

export const PAGE_SIZE = 20;

// typed text is matched as plain text, never as a pattern
function plainText(text: string) {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

// users whose name or phone matches the search
async function matchingUserIds(q: string) {
  const pattern = plainText(q);
  const users = await UserModel.find({ $or: [{ name: pattern }, { phone: pattern }] }, '_id');
  return users.map((user) => user._id);
}

export async function listAllBookings(query: AdminBookingsQuery) {
  const filter: Record<string, unknown> = {};
  if (query.status.length) filter.status = { $in: query.status };
  if (query.q) {
    const ids = await matchingUserIds(query.q);
    // the booking number (the end of its id) can be searched too
    const byId = isValidObjectId(query.q) ? [{ _id: query.q }] : [];
    filter.$or = [{ customerId: { $in: ids } }, { technicianId: { $in: ids } }, ...byId];
  }
  const [total, bookings] = await Promise.all([
    BookingModel.countDocuments(filter),
    BookingModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE),
  ]);
  return {
    bookings: await buildBookingViews(bookings, () => 'admin'),
    total,
    page: query.page,
    pageSize: PAGE_SIZE,
  };
}

async function countByUser(field: 'customerId' | 'technicianId', ids: Types.ObjectId[]) {
  const rows = await BookingModel.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { [field]: { $in: ids } } },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [row._id.toString(), row.count]));
}

export async function listUsers(query: AdminUsersQuery) {
  const filter: Record<string, unknown> = {};
  if (query.role) filter.role = query.role;
  if (query.status) filter.status = query.status;
  if (query.q) {
    const pattern = plainText(query.q);
    filter.$or = [{ name: pattern }, { phone: pattern }, { email: pattern }];
  }
  const [total, users] = await Promise.all([
    UserModel.countDocuments(filter),
    UserModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE),
  ]);
  const ids = users.map((user) => user._id);
  const [asCustomer, asTechnician] = await Promise.all([
    countByUser('customerId', ids),
    countByUser('technicianId', ids),
  ]);

  return {
    users: users.map((user) => ({
      id: user.id as string,
      name: user.name,
      phone: user.phone,
      email: user.email ?? null,
      role: user.role,
      status: user.status,
      joinedAt: user.get('createdAt') as Date,
      // bookings made (customer) or jobs received (technician)
      bookings:
        (user.role === 'technician' ? asTechnician : asCustomer).get(user.id as string) ?? 0,
    })),
    total,
    page: query.page,
    pageSize: PAGE_SIZE,
  };
}

export async function setUserStatus(id: string, status: UserStatus, admin: UserDocument) {
  const user = isValidObjectId(id) ? await UserModel.findById(id) : null;
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', "We couldn't find this user.");
  // admins can't lock themselves (or each other) out
  if (user.role === 'admin' || user._id.equals(admin._id)) {
    throw new AppError(403, 'NOT_ALLOWED', "Admin accounts can't be blocked here.");
  }
  user.status = status;
  await user.save();
  if (status === 'blocked') disconnectUser(user.id as string);
  return {
    user: { id: user.id as string, name: user.name, role: user.role, status: user.status },
  };
}
