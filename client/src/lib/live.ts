import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_URL } from './api';
import type { BookingStatus } from './bookings';
import { getToken } from './token-storage';

export interface ChatMessage {
  id: string;
  bookingId: string;
  text: string;
  at: string;
  from: 'customer' | 'technician';
}

export type SendResult =
  { ok: true; message: ChatMessage } | { ok: false; code: string; error: string };

let socket: Socket | null = null;

// the live connection uses the API's own address, without /api/v1
function liveUrl() {
  return new URL(API_URL).origin;
}

// one shared connection for the whole app, opened on first use
export function getLiveSocket(): Socket {
  if (!socket) {
    socket = io(liveUrl(), {
      // read the token on every (re)connect, so a new login is picked up
      auth: (send) => send({ token: getToken() ?? '' }),
      transports: ['websocket'],
    });
  }
  return socket;
}

export function closeLiveSocket() {
  socket?.disconnect();
  socket = null;
}

interface BookingLiveHandlers {
  onStatus?: (status: BookingStatus) => void;
  onMessage?: (message: ChatMessage) => void;
}

// listen to one booking's room while the page is open
export function useBookingLive(bookingId: string | undefined, handlers: BookingLiveHandlers) {
  // keep the latest handlers without reconnecting on every render
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    if (!bookingId) return;
    const live = getLiveSocket();
    const join = () => live.emit('booking:join', { bookingId });
    const onStatus = (data: { bookingId: string; status: BookingStatus }) => {
      if (data.bookingId === bookingId) latest.current.onStatus?.(data.status);
    };
    const onMessage = (message: ChatMessage) => {
      if (message.bookingId === bookingId) latest.current.onMessage?.(message);
    };

    // join now, and again after the connection comes back
    if (live.connected) join();
    live.on('connect', join);
    live.on('booking:status', onStatus);
    live.on('message:new', onMessage);
    return () => {
      live.off('connect', join);
      live.off('booking:status', onStatus);
      live.off('message:new', onMessage);
      live.emit('booking:leave', { bookingId });
    };
  }, [bookingId]);
}

export async function sendChatMessage(bookingId: string, text: string): Promise<SendResult> {
  try {
    return (await getLiveSocket()
      .timeout(8000)
      .emitWithAck('message:send', { bookingId, text })) as SendResult;
  } catch {
    return {
      ok: false,
      code: 'NO_CONNECTION',
      error: "Couldn't send. Check your internet and try again.",
    };
  }
}
