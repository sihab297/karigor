// a stand-in for the Socket.IO connection, so page tests never open a real one
type Listener = (...args: unknown[]) => void;

export interface SentEvent {
  event: string;
  data: unknown;
}

class FakeSocket {
  connected = true;
  sent: SentEvent[] = [];
  // what the "server" answers to message:send; tests can replace it
  answerSend: (data: { bookingId: string; text: string }) => unknown = (data) => ({
    ok: true,
    message: {
      id: `m${this.sent.length}`,
      bookingId: data.bookingId,
      text: data.text,
      at: new Date().toISOString(),
      from: 'customer',
    },
  });
  private listeners = new Map<string, Set<Listener>>();

  on(event: string, listener: Listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
    return this;
  }

  off(event: string, listener: Listener) {
    this.listeners.get(event)?.delete(listener);
    return this;
  }

  emit(event: string, data: unknown) {
    this.sent.push({ event, data });
    return this;
  }

  timeout() {
    return {
      emitWithAck: async (event: string, data: { bookingId: string; text: string }) => {
        this.sent.push({ event, data });
        return this.answerSend(data);
      },
    };
  }

  disconnect() {
    this.connected = false;
    return this;
  }

  // the "server" sends an event to the page
  serverSends(event: string, data: unknown) {
    for (const listener of this.listeners.get(event) ?? []) listener(data);
  }
}

export let fakeLive = new FakeSocket();

export function resetFakeLive() {
  fakeLive = new FakeSocket();
}

export const fakeIo = () => fakeLive;
