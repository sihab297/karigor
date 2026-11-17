import { ArrowLeft, LoaderCircle, Phone, Star } from 'lucide-react';
import { useCallback, useEffect, useId, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { ChatBox } from '../../components/bookings/ChatBox';
import { StatusTag } from '../../components/bookings/StatusTag';
import { StatusTimeline } from '../../components/bookings/StatusTimeline';
import { Modal } from '../../components/Modal';
import { api, ApiError } from '../../lib/api';
import { dhakaDateTime, type Booking } from '../../lib/bookings';
import { formErrorsFrom, noErrors, type FormErrors } from '../../lib/form-errors';
import { useBookingLive, type ChatMessage } from '../../lib/live';
import { taka, takaRange } from '../../lib/money';
import { firstName } from '../../lib/names';
import { useDocumentTitle } from '../../lib/use-document-title';

const cardClass = 'grid gap-3.5 rounded-box border border-line bg-white p-4 sm:p-5';

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function CancelDialog({
  booking,
  onClose,
  onCancelled,
}: {
  booking: Booking;
  onClose: () => void;
  onCancelled: (booking: Booking) => void;
}) {
  const reasonId = useId();
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<FormErrors>(noErrors);
  const [saving, setSaving] = useState(false);
  const name = firstName(booking.technician.name);
  // once accepted, the karigor deserves to know why
  const needsReason = booking.status === 'accepted';

  async function handleCancel(event: FormEvent) {
    event.preventDefault();
    if (needsReason && reason.trim().length < 5) {
      setErrors({ fields: { reason: `Tell ${name} why you are cancelling` }, message: '' });
      return;
    }
    setSaving(true);
    setErrors(noErrors);
    try {
      const data = await api<{ booking: Booking }>(`/bookings/${booking.id}/status`, {
        method: 'PATCH',
        body: { status: 'cancelled', ...(reason.trim() ? { reason: reason.trim() } : {}) },
      });
      onCancelled(data.booking);
    } catch (error) {
      setErrors(formErrorsFrom(error));
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Cancel this booking?"
      subtitle={
        needsReason
          ? `${name} already said yes and is planning to come.`
          : `${name} hasn't replied yet.`
      }
      onClose={onClose}
    >
      <form className="grid gap-4" onSubmit={handleCancel} noValidate>
        {errors.message && <Alert>{errors.message}</Alert>}
        <div className="grid gap-1.5">
          <label htmlFor={reasonId} className="text-sm font-semibold">
            Why are you cancelling?{' '}
            {!needsReason && <span className="font-normal text-muted">(optional)</span>}
          </label>
          <textarea
            id={reasonId}
            rows={3}
            value={reason}
            maxLength={300}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. The leak stopped by itself."
            aria-invalid={errors.fields.reason ? true : undefined}
            className={`w-full resize-y rounded-box border-[1.5px] bg-white px-3.5 py-2.5 text-base placeholder:text-muted/70 focus:border-tea focus:outline-none ${
              errors.fields.reason ? 'border-alert' : 'border-line'
            }`}
          />
          {errors.fields.reason && (
            <p className="text-sm font-medium text-alert">{errors.fields.reason}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Button type="button" variant="secondary" onClick={onClose}>
            Keep it
          </Button>
          <Button type="submit" variant="danger" loading={saving}>
            Cancel booking
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function BookingDetailsPage() {
  useDocumentTitle('Booking');
  const { id = '' } = useParams();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loadError, setLoadError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [cancelling, setCancelling] = useState(false);
  const closeCancel = useCallback(() => setCancelling(false), []);

  useEffect(() => {
    let stillHere = true;
    api<{ booking: Booking }>(`/bookings/${id}`)
      .then((data) => stillHere && setBooking(data.booking))
      .catch((error: unknown) => {
        if (!stillHere) return;
        if (error instanceof ApiError && error.status === 404) setNotFound(true);
        else setLoadError(formErrorsFrom(error).message || "Couldn't load this booking.");
      });
    return () => {
      stillHere = false;
    };
  }, [id, attempt]);

  // status changes and chat messages arrive without refreshing the page
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  useBookingLive(id, {
    onStatus: () => {
      api<{ booking: Booking }>(`/bookings/${id}`)
        .then((data) => setBooking(data.booking))
        .catch(() => undefined);
    },
    onMessage: (message) => setLiveMessages((list) => [...list, message]),
  });

  const back = (
    <Link
      to="/bookings"
      className="inline-flex items-center gap-1 font-semibold text-muted hover:text-tea"
    >
      <ArrowLeft size={18} aria-hidden="true" />
      My bookings
    </Link>
  );

  if (notFound) {
    return (
      <div className="mx-auto grid max-w-2xl gap-3">
        {back}
        <h1 className="text-3xl font-extrabold">We couldn't find this booking</h1>
        <p className="text-muted">The link may be wrong, or it belongs to another account.</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto grid max-w-md gap-4">
        <Alert>{loadError}</Alert>
        <Button
          variant="secondary"
          onClick={() => {
            setLoadError('');
            setAttempt((n) => n + 1);
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="grid place-items-center py-20 text-muted">
        <LoaderCircle className="animate-spin" aria-label="Loading your booking" />
      </div>
    );
  }

  const tech = booking.technician;
  const name = firstName(tech.name);
  const canCancel = booking.actions.includes('cancelled');
  const onTheWay = booking.status === 'on_the_way' || booking.status === 'arrived';
  const details: [string, string][] = [
    [
      'When',
      booking.emergency
        ? `Right now (${dhakaDateTime(booking.scheduledAt)})`
        : dhakaDateTime(booking.scheduledAt),
    ],
    ['Address', booking.addressText ?? ''],
    ...(booking.note ? ([['Note', booking.note]] as [string, string][]) : []),
    booking.finalPrice !== null
      ? ['Final price', `${taka(booking.finalPrice)}, paid in cash`]
      : [
          'Rough price',
          booking.estimate
            ? `${takaRange(booking.estimate.min, booking.estimate.max)} + parts`
            : 'Agreed after checking',
        ],
    ['Pay', 'Cash, after the work'],
  ];

  return (
    <div className="mx-auto grid max-w-4xl gap-5">
      {back}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">{booking.serviceName}</h1>
          {booking.problem && (
            <p className="text-muted">{booking.problem.summary ?? booking.problem.text}</p>
          )}
        </div>
        <StatusTag status={booking.status} />
      </div>

      {booking.status === 'rejected' && (
        <section className="grid gap-2 rounded-box bg-turmeric-soft px-4 py-3.5">
          <p className="font-semibold">{name} couldn't take this job.</p>
          <p>Choose another karigor for the same problem. It only takes a minute.</p>
          <Link
            to={`/request/${booking.problemId}`}
            className="inline-flex h-11 items-center justify-self-start rounded-box bg-turmeric px-4 font-bold text-tea hover:bg-turmeric-dark"
          >
            Choose another karigor
          </Link>
        </section>
      )}

      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:items-start">
        <section className={cardClass} aria-labelledby="progress-title">
          <h2 id="progress-title" className="text-xl font-bold">
            Progress
          </h2>
          <StatusTimeline booking={booking} />
        </section>

        <div className="grid gap-5">
          <section className={cardClass} aria-label="Your karigor">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="grid size-12 shrink-0 place-items-center rounded-full bg-pond-soft font-bold text-pond"
              >
                {initials(tech.name)}
              </span>
              <div className="grid flex-1 leading-tight">
                <b className="text-lg">{tech.name}</b>
                <span className="flex items-center gap-1 text-sm text-muted">
                  {tech.rating !== null ? (
                    <>
                      <Star
                        size={14}
                        className="fill-turmeric-dark text-turmeric-dark"
                        aria-hidden="true"
                      />
                      {tech.rating} ({tech.ratingCount} reviews)
                    </>
                  ) : (
                    'New on Karigor'
                  )}
                </span>
              </div>
              {tech.phone && (
                <a
                  href={`tel:${tech.phone}`}
                  className="inline-flex h-11 items-center gap-2 rounded-box border-[1.5px] border-line px-3 font-semibold text-pond hover:border-pond"
                >
                  <Phone size={18} aria-hidden="true" />
                  Call
                </a>
              )}
            </div>
            <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 border-t border-line pt-3.5">
              {details.map(([label, text]) => (
                <div key={label} className="contents">
                  <dt className="text-muted">{label}</dt>
                  <dd className="font-semibold">{text}</dd>
                </div>
              ))}
            </dl>
          </section>

          {canCancel && (
            <Button variant="secondary" onClick={() => setCancelling(true)}>
              Cancel booking
            </Button>
          )}
          {onTheWay && (
            <p className="text-center text-sm text-muted">
              {name} is on the way, so this booking can't be cancelled here. Call {name} if plans
              change.
            </p>
          )}
        </div>
      </div>

      <ChatBox booking={booking} viewer="customer" liveMessages={liveMessages} />

      {cancelling && (
        <CancelDialog
          booking={booking}
          onClose={closeCancel}
          onCancelled={(updated) => {
            setBooking(updated);
            setCancelling(false);
          }}
        />
      )}
    </div>
  );
}
