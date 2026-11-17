import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { BookingModel } from '../src/models/booking.model';
import { ProblemReportModel } from '../src/models/problem-report.model';
import { UserModel, type UserRole } from '../src/models/user.model';
import { attachSocketServer, closeSocketServer } from '../src/realtime/socket';
import { createToken } from '../src/utils/jwt';
import { useTestDatabase } from './helpers/test-db';

useTestDatabase();

const app = createApp();
let server: Server;
let url: string;
const sockets: Socket[] = [];

type TestUser = { id: string; token: string };
let customer: TestUser;
let technician: TestUser;
let phone = 0;

async function makeUser(role: UserRole, status: 'active' | 'blocked' = 'active') {
  const user = await UserModel.create({
    name: `Test ${role}`,
    phone: `0170000${String(phone++).padStart(4, '0')}`,
    passwordHash: 'x',
    role,
    status,
  });
  return { id: user.id as string, token: createToken(user.id, role) };
}

async function makeBooking(status = 'accepted') {
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
    scheduledAt: new Date(Date.now() + 60 * 60 * 1000),
    location: { type: 'Point', coordinates: [90.3654, 23.8223] },
    addressText: 'House 12, Road 5',
    status,
    statusHistory: [{ status: 'requested', at: new Date(), byUserId: customer.id }],
  }).save();
  return booking.id as string;
}

// connects and waits until the server says yes or no
function open(token?: string) {
  const socket = connect(url, {
    auth: token ? { token } : {},
    transports: ['websocket'],
    reconnection: false,
  });
  sockets.push(socket);
  return new Promise<Socket>((resolve, reject) => {
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', (error) => reject(error));
  });
}

const join = (socket: Socket, bookingId: string) =>
  socket.timeout(2000).emitWithAck('booking:join', { bookingId }) as Promise<{
    ok: boolean;
    message?: string;
  }>;

function nextEvent<T>(socket: Socket, event: string) {
  return new Promise<T>((resolve) => socket.once(event, resolve));
}

beforeAll(async () => {
  server = createServer(app);
  attachSocketServer(server);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  url = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await closeSocketServer();
  await new Promise((resolve) => server.close(resolve));
});

beforeEach(async () => {
  phone = 0;
  customer = await makeUser('customer');
  technician = await makeUser('technician');
});

afterEach(() => {
  for (const socket of sockets.splice(0)) socket.disconnect();
});

describe('live connection', () => {
  it('needs a valid login', async () => {
    await expect(open()).rejects.toThrow('NOT_LOGGED_IN');
    await expect(open('not-a-token')).rejects.toThrow('NOT_LOGGED_IN');
    const blocked = await makeUser('customer', 'blocked');
    await expect(open(blocked.token)).rejects.toThrow('NOT_LOGGED_IN');

    const socket = await open(customer.token);
    expect(socket.connected).toBe(true);
  });

  it('lets only the customer and technician of a booking join its room', async () => {
    const bookingId = await makeBooking();
    const stranger = await makeUser('customer');

    expect(await join(await open(customer.token), bookingId)).toEqual({ ok: true });
    expect(await join(await open(technician.token), bookingId)).toEqual({ ok: true });
    expect(await join(await open(stranger.token), bookingId)).toMatchObject({ ok: false });
    expect(await join(await open(customer.token), 'not-an-id')).toMatchObject({ ok: false });
  });

  it('tells the room right away when the status changes', async () => {
    const bookingId = await makeBooking('accepted');
    const customerSocket = await open(customer.token);
    await join(customerSocket, bookingId);
    const outsider = await open((await makeUser('customer')).token);
    let outsiderHeard = false;
    outsider.on('booking:status', () => {
      outsiderHeard = true;
    });

    const heard = nextEvent<{ bookingId: string; status: string }>(
      customerSocket,
      'booking:status',
    );
    const res = await request(app)
      .patch(`/api/v1/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${technician.token}`)
      .send({ status: 'on_the_way' });

    expect(res.status).toBe(200);
    expect(await heard).toEqual({ bookingId, status: 'on_the_way' });
    expect(outsiderHeard).toBe(false);
  });
});

describe('chat', () => {
  const send = (socket: Socket, bookingId: string, text: string) =>
    socket.timeout(2000).emitWithAck('message:send', { bookingId, text }) as Promise<{
      ok: boolean;
      code?: string;
      error?: string;
      message?: { id: string; text: string; from: string };
    }>;

  const history = (bookingId: string, token: string) =>
    request(app)
      .get(`/api/v1/bookings/${bookingId}/messages`)
      .set('Authorization', `Bearer ${token}`);

  it('sends a message live to both people and saves it', async () => {
    const bookingId = await makeBooking('accepted');
    const customerSocket = await open(customer.token);
    const technicianSocket = await open(technician.token);
    await join(customerSocket, bookingId);
    await join(technicianSocket, bookingId);

    const arrives = nextEvent<{ text: string; from: string }>(technicianSocket, 'message:new');
    const result = await send(customerSocket, bookingId, '  Gate is on the left  ');

    expect(result).toMatchObject({
      ok: true,
      message: { text: 'Gate is on the left', from: 'customer' },
    });
    expect(await arrives).toMatchObject({ text: 'Gate is on the left', from: 'customer' });

    await send(technicianSocket, bookingId, 'Coming in 15 minutes');
    const res = await history(bookingId, technician.token);
    expect(res.status).toBe(200);
    expect(res.body.data.chatOpen).toBe(true);
    expect(
      res.body.data.messages.map((m: { text: string; from: string }) => [m.from, m.text]),
    ).toEqual([
      ['customer', 'Gate is on the left'],
      ['technician', 'Coming in 15 minutes'],
    ]);
  });

  it('opens the chat only from accepted until the job is done', async () => {
    const socket = await open(customer.token);

    const requested = await makeBooking('requested');
    expect(await send(socket, requested, 'Hello?')).toMatchObject({
      ok: false,
      code: 'CHAT_CLOSED',
    });

    const completed = await makeBooking('completed');
    expect(await send(socket, completed, 'Thanks!')).toMatchObject({
      ok: false,
      code: 'CHAT_CLOSED',
    });
    const res = await history(completed, customer.token);
    expect(res.status).toBe(200);
    expect(res.body.data.chatOpen).toBe(false);
  });

  it('refuses empty messages and other people', async () => {
    const bookingId = await makeBooking('accepted');
    const stranger = await makeUser('customer');

    expect(await send(await open(customer.token), bookingId, '   ')).toMatchObject({
      ok: false,
      code: 'VALIDATION_ERROR',
    });
    expect(await send(await open(stranger.token), bookingId, 'Hi')).toMatchObject({
      ok: false,
      code: 'BOOKING_NOT_FOUND',
    });
    expect((await history(bookingId, stranger.token)).status).toBe(404);
  });
});
