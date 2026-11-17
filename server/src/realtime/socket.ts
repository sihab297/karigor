import type { Server as HttpServer } from 'node:http';
import { isValidObjectId } from 'mongoose';
import { Server, type Socket } from 'socket.io';
import { env } from '../config/env';
import { BookingModel } from '../models/booking.model';
import { UserModel, type UserDocument } from '../models/user.model';
import { readToken } from '../utils/jwt';

// what the server sends; see "Live events" in docs/05-api.md
export interface ServerToClientEvents {
  'booking:status': (data: { bookingId: string; status: string }) => void;
  'booking:new': (data: { bookingId: string; serviceName: string; emergency: boolean }) => void;
}

type JoinResult = { ok: true } | { ok: false; message: string };

// what the website sends
export interface ClientToServerEvents {
  'booking:join': (data: { bookingId: string }, reply: (result: JoinResult) => void) => void;
  'booking:leave': (data: { bookingId: string }) => void;
}

interface SocketData {
  user: UserDocument;
}

type KarigorServer = Server<ClientToServerEvents, ServerToClientEvents, object, SocketData>;
type KarigorSocket = Socket<ClientToServerEvents, ServerToClientEvents, object, SocketData>;

let io: KarigorServer | null = null;

export const bookingRoom = (bookingId: string) => `booking:${bookingId}`;
export const userRoom = (userId: string) => `user:${userId}`;

// same check as requireAuth: a valid token for a user who is not blocked
async function checkLogin(socket: KarigorSocket, next: (error?: Error) => void) {
  const token: unknown = socket.handshake.auth.token;
  try {
    const { userId } = readToken(typeof token === 'string' ? token : '');
    const user = isValidObjectId(userId) ? await UserModel.findById(userId) : null;
    if (!user || user.status === 'blocked') return next(new Error('NOT_LOGGED_IN'));
    socket.data.user = user;
    next();
  } catch {
    next(new Error('NOT_LOGGED_IN'));
  }
}

async function joinBooking(socket: KarigorSocket, bookingId: unknown): Promise<JoinResult> {
  const user = socket.data.user;
  const booking =
    typeof bookingId === 'string' && isValidObjectId(bookingId)
      ? await BookingModel.findById(bookingId, 'customerId technicianId')
      : null;
  // only the two people in the booking may listen to it
  const isInBooking =
    booking && (booking.customerId.equals(user._id) || booking.technicianId.equals(user._id));
  if (!booking || !isInBooking) return { ok: false, message: "We couldn't find this booking." };
  await socket.join(bookingRoom(booking.id as string));
  return { ok: true };
}

export function attachSocketServer(server: HttpServer): KarigorServer {
  io = new Server<ClientToServerEvents, ServerToClientEvents, object, SocketData>(server, {
    cors: { origin: env.CLIENT_URL },
    serveClient: false,
  });

  io.use((socket, next) => void checkLogin(socket, next));

  io.on('connection', (socket) => {
    // a personal room, for news like a new booking request
    void socket.join(userRoom(socket.data.user.id as string));

    socket.on('booking:join', (data, reply) => {
      joinBooking(socket, data?.bookingId)
        .then((result) => typeof reply === 'function' && reply(result))
        .catch(
          () => typeof reply === 'function' && reply({ ok: false, message: 'Please try again.' }),
        );
    });

    socket.on('booking:leave', (data) => {
      if (typeof data?.bookingId === 'string') void socket.leave(bookingRoom(data.bookingId));
    });
  });

  return io;
}

export async function closeSocketServer() {
  await io?.close();
  io = null;
}

// safe to call when no socket server is running (for example in API tests)
export function emitBookingStatus(bookingId: string, status: string) {
  io?.to(bookingRoom(bookingId)).emit('booking:status', { bookingId, status });
}

export function emitNewBooking(
  technicianId: string,
  data: { bookingId: string; serviceName: string; emergency: boolean },
) {
  io?.to(userRoom(technicianId)).emit('booking:new', data);
}
