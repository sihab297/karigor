import { LoaderCircle, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { StatusTag } from '../../components/bookings/StatusTag';
import { ServiceIcon } from '../../components/ServiceIcon';
import { api } from '../../lib/api';
import { dhakaDateTime, OPEN_STATUSES, type Booking } from '../../lib/bookings';
import { formErrorsFrom } from '../../lib/form-errors';
import { taka, takaRange } from '../../lib/money';
import { useDocumentTitle } from '../../lib/use-document-title';

type Tab = 'active' | 'past';

function BookingCard({ booking }: { booking: Booking }) {
  const price =
    booking.finalPrice !== null
      ? `Paid ${taka(booking.finalPrice)}`
      : booking.estimate
        ? takaRange(booking.estimate.min, booking.estimate.max)
        : null;
  return (
    <li>
      <Link
        to={`/bookings/${booking.id}`}
        className="grid gap-2.5 rounded-box border border-line bg-white p-4 hover:border-tea"
      >
        <span className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2.5 font-semibold">
            <span className="grid size-9 place-items-center rounded-full bg-turmeric-soft">
              <ServiceIcon serviceId={booking.serviceId} size={18} />
            </span>
            {booking.serviceName}
          </span>
          <StatusTag status={booking.status} />
        </span>
        {booking.problem && (
          <span className="line-clamp-2">{booking.problem.summary ?? booking.problem.text}</span>
        )}
        <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm text-muted">
          <span>{booking.technician.name}</span>
          <span>
            {booking.emergency && booking.status === 'requested'
              ? 'Right now'
              : dhakaDateTime(booking.scheduledAt)}
            {price && ` · ${price}`}
          </span>
        </span>
      </Link>
    </li>
  );
}

export default function MyBookingsPage() {
  useDocumentTitle('My bookings');
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<Tab>('active');

  useEffect(() => {
    let stillHere = true;
    api<{ bookings: Booking[] }>('/bookings')
      .then((data) => stillHere && setBookings(data.bookings))
      .catch((err: unknown) => {
        if (stillHere) setError(formErrorsFrom(err).message || "Couldn't load your bookings.");
      });
    return () => {
      stillHere = false;
    };
  }, [attempt]);

  const active = bookings?.filter((b) => OPEN_STATUSES.includes(b.status)) ?? [];
  const past = bookings?.filter((b) => !OPEN_STATUSES.includes(b.status)) ?? [];
  const shown = tab === 'active' ? active : past;
  const tabClass = (on: boolean) =>
    `-mb-px border-b-[3px] px-1 pb-2.5 pt-2 font-semibold ${
      on ? 'border-turmeric text-tea' : 'border-transparent text-muted hover:text-tea'
    }`;

  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">My bookings</h1>
        <Link
          to="/request"
          className="inline-flex h-10 items-center gap-1.5 rounded-box bg-turmeric px-3.5 font-bold text-tea hover:bg-turmeric-dark"
        >
          <Plus size={18} aria-hidden="true" />
          New problem
        </Link>
      </div>

      {error ? (
        <div className="grid max-w-md gap-4">
          <Alert>{error}</Alert>
          <Button
            variant="secondary"
            onClick={() => {
              setError('');
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </Button>
        </div>
      ) : !bookings ? (
        <div className="grid place-items-center py-16 text-muted">
          <LoaderCircle className="animate-spin" aria-label="Loading your bookings" />
        </div>
      ) : (
        <>
          <div role="tablist" aria-label="Bookings" className="flex gap-5 border-b border-line">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'active'}
              className={tabClass(tab === 'active')}
              onClick={() => setTab('active')}
            >
              Active ({active.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'past'}
              className={tabClass(tab === 'past')}
              onClick={() => setTab('past')}
            >
              Past ({past.length})
            </button>
          </div>

          {shown.length > 0 ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {shown.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </ul>
          ) : (
            <div className="grid justify-items-start gap-2 rounded-box border border-dashed border-line bg-white p-5">
              <p className="font-semibold">
                {tab === 'active' ? 'No active bookings.' : 'No past bookings yet.'}
              </p>
              <p className="text-muted">
                Something broken at home? Tell us the problem and book a karigor.
              </p>
              <Link to="/request" className="font-semibold text-pond underline underline-offset-2">
                Get help now
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
