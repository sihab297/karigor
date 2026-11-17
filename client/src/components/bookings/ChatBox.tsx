import { LoaderCircle, MessageCircle, SendHorizontal } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { dhakaDateTime, type Booking } from '../../lib/bookings';
import { sendChatMessage, type ChatMessage } from '../../lib/live';
import { firstName } from '../../lib/names';
import { Alert } from '../Alert';

const OPEN = ['accepted', 'on_the_way', 'arrived'];

interface ChatBoxProps {
  booking: Booking;
  viewer: 'customer' | 'technician';
  // messages that arrived live while the page was open
  liveMessages: ChatMessage[];
}

export function ChatBox({ booking, viewer, liveMessages }: ChatBoxProps) {
  const inputId = useId();
  const other = viewer === 'customer' ? booking.technician.name : booking.customer.name;
  const otherFirst = firstName(other);
  const open = OPEN.includes(booking.status);
  const wasAccepted = booking.statusHistory.some((change) => change.status === 'accepted');
  const [history, setHistory] = useState<ChatMessage[] | null>(null);
  const [sent, setSent] = useState<ChatMessage[]>([]);
  const [loadError, setLoadError] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (!wasAccepted) return;
    let stillHere = true;
    api<{ messages: ChatMessage[] }>(`/bookings/${booking.id}/messages`)
      .then((data) => stillHere && setHistory(data.messages))
      .catch(() => stillHere && setLoadError("Couldn't load the messages."));
    return () => {
      stillHere = false;
    };
  }, [booking.id, wasAccepted]);

  // history, my sent messages and live ones, each shown once, oldest first
  const messages = useMemo(() => {
    const byId = new Map<string, ChatMessage>();
    for (const message of [...(history ?? []), ...sent, ...liveMessages]) {
      byId.set(message.id, message);
    }
    return [...byId.values()].sort((a, b) => a.at.localeCompare(b.at));
  }, [history, sent, liveMessages]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length]);

  if (!wasAccepted && booking.status !== 'requested') return null;

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    setSendError('');
    const result = await sendChatMessage(booking.id, trimmed);
    setSending(false);
    if (result.ok) {
      setSent((list) => [...list, result.message]);
      setText('');
    } else {
      setSendError(result.error);
    }
  }

  return (
    <section
      className="grid gap-3 rounded-box border border-line bg-white p-4 sm:p-5"
      aria-labelledby={`${inputId}-title`}
    >
      <h2 id={`${inputId}-title`} className="flex items-center gap-2 text-xl font-bold">
        <MessageCircle size={20} aria-hidden="true" />
        Chat with {otherFirst}
      </h2>

      {booking.status === 'requested' ? (
        <p className="text-muted">The chat opens when {otherFirst} accepts.</p>
      ) : loadError ? (
        <Alert>{loadError}</Alert>
      ) : !history ? (
        <div className="grid place-items-center py-6 text-muted">
          <LoaderCircle className="animate-spin" aria-label="Loading messages" />
        </div>
      ) : (
        <>
          <ol
            ref={listRef}
            aria-label="Messages"
            aria-live="polite"
            className="grid max-h-80 gap-2 overflow-y-auto rounded-box bg-paper p-3"
          >
            {messages.length === 0 && (
              <li className="py-2 text-center text-sm text-muted">
                {open
                  ? `No messages yet. Say hello, or tell ${otherFirst} how to find you.`
                  : 'No messages.'}
              </li>
            )}
            {messages.map((message) => {
              const mine = message.from === viewer;
              return (
                <li
                  key={message.id}
                  className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                    mine
                      ? 'justify-self-end rounded-br-sm bg-turmeric-soft'
                      : 'justify-self-start rounded-bl-sm border border-line bg-white'
                  }`}
                >
                  <span className="sr-only">{mine ? 'You' : otherFirst}: </span>
                  <span className="whitespace-pre-wrap break-words">{message.text}</span>
                  <time className="block text-xs text-muted">{dhakaDateTime(message.at)}</time>
                </li>
              );
            })}
          </ol>

          {open ? (
            <form className="grid gap-2" onSubmit={handleSend}>
              {sendError && <Alert>{sendError}</Alert>}
              <div className="flex gap-2">
                <label htmlFor={inputId} className="sr-only">
                  Message to {otherFirst}
                </label>
                <input
                  id={inputId}
                  value={text}
                  maxLength={1000}
                  autoComplete="off"
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Type a message…"
                  className="h-12 min-w-0 flex-1 rounded-box border-[1.5px] border-line bg-white px-3.5 text-base placeholder:text-muted/70 focus:border-tea focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={sending || !text.trim()}
                  aria-label="Send"
                  className="grid size-12 shrink-0 place-items-center rounded-box bg-turmeric text-tea hover:bg-turmeric-dark disabled:opacity-60"
                >
                  {sending ? (
                    <LoaderCircle size={20} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <SendHorizontal size={20} aria-hidden="true" />
                  )}
                </button>
              </div>
            </form>
          ) : (
            <p className="text-center text-sm text-muted">
              The chat is closed for this booking. You can still read the messages.
            </p>
          )}
        </>
      )}
    </section>
  );
}
