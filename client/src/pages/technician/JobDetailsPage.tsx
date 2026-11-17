import { ArrowLeft, LoaderCircle, Phone, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { ChatBox } from '../../components/bookings/ChatBox';
import { StatusTag } from '../../components/bookings/StatusTag';
import { StatusTimeline } from '../../components/bookings/StatusTimeline';
import { Modal } from '../../components/Modal';
import { TextField } from '../../components/TextField';
import { api, ApiError } from '../../lib/api';
import { dhakaDateTime, type Booking, type BookingStatus } from '../../lib/bookings';
import { formErrorsFrom, noErrors, type FormErrors } from '../../lib/form-errors';
import { useBookingLive, type ChatMessage } from '../../lib/live';
import { taka, takaRange } from '../../lib/money';
import { firstName } from '../../lib/names';
import { useDocumentTitle } from '../../lib/use-document-title';
import { useWorkArea } from './use-work-area';

const cardClass = 'grid gap-3.5 rounded-box border border-line bg-white p-4 sm:p-5';

// the one next step for each status, as a button
const NEXT_STEP: Partial<Record<BookingStatus, { to: BookingStatus; label: string }>> = {
  accepted: { to: 'on_the_way', label: "I'm on the way" },
  on_the_way: { to: 'arrived', label: "I've arrived" },
};

export default function JobDetailsPage() {
  useDocumentTitle('Job');
  const { id = '' } = useParams();
  const { describePlace } = useWorkArea();
  const [job, setJob] = useState<Booking | null>(null);
  const [loadError, setLoadError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState<BookingStatus | null>(null);
  const [errors, setErrors] = useState<FormErrors>(noErrors);
  const [finalPrice, setFinalPrice] = useState('');
  const [confirmReject, setConfirmReject] = useState(false);
  const closeReject = useCallback(() => setConfirmReject(false), []);

  useEffect(() => {
    let stillHere = true;
    api<{ booking: Booking }>(`/bookings/${id}`)
      .then((data) => stillHere && setJob(data.booking))
      .catch((error: unknown) => {
        if (!stillHere) return;
        if (error instanceof ApiError && error.status === 404) setNotFound(true);
        else setLoadError(formErrorsFrom(error).message || "Couldn't load this job.");
      });
    return () => {
      stillHere = false;
    };
  }, [id, attempt]);

  // a cancel by the customer and chat messages arrive without refreshing the page
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  useBookingLive(id, {
    onStatus: () => {
      api<{ booking: Booking }>(`/bookings/${id}`)
        .then((data) => setJob(data.booking))
        .catch(() => undefined);
    },
    onMessage: (message) => setLiveMessages((list) => [...list, message]),
  });

  async function moveTo(status: BookingStatus, extra: object = {}) {
    setSaving(status);
    setErrors(noErrors);
    try {
      const data = await api<{ booking: Booking }>(`/bookings/${id}/status`, {
        method: 'PATCH',
        body: { status, ...extra },
      });
      setJob(data.booking);
      setConfirmReject(false);
    } catch (error) {
      setErrors(formErrorsFrom(error));
    } finally {
      setSaving(null);
    }
  }

  function handleComplete(event: FormEvent) {
    event.preventDefault();
    const price = Number(finalPrice);
    if (finalPrice.trim() === '' || !Number.isInteger(price) || price < 0) {
      setErrors({ fields: { finalPrice: 'Write the price in whole taka, like 450' }, message: '' });
      return;
    }
    void moveTo('completed', { finalPrice: price });
  }

  const back = (
    <Link
      to="/tech/jobs"
      className="inline-flex items-center gap-1 font-semibold text-muted hover:text-tea"
    >
      <ArrowLeft size={18} aria-hidden="true" />
      My jobs
    </Link>
  );

  if (notFound) {
    return (
      <div className="mx-auto grid max-w-2xl gap-3">
        {back}
        <h1 className="text-3xl font-extrabold">We couldn't find this job</h1>
        <p className="text-muted">The link may be wrong, or the job belongs to someone else.</p>
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
  if (!job) {
    return (
      <div className="grid place-items-center py-20 text-muted">
        <LoaderCircle className="animate-spin" aria-label="Loading the job" />
      </div>
    );
  }

  const customer = job.customer;
  const customerFirst = firstName(customer.name);
  const can = (status: BookingStatus) => job.actions.includes(status);
  const next = NEXT_STEP[job.status];
  const place = describePlace(job.location);
  const facts: [string, string][] = [
    [
      'When',
      job.emergency && job.status === 'requested'
        ? `Right now (${dhakaDateTime(job.scheduledAt)})`
        : dhakaDateTime(job.scheduledAt),
    ],
    ...(place ? ([['Where', place]] as [string, string][]) : []),
    ['Customer', customer.name],
    job.finalPrice !== null
      ? ['Final price', taka(job.finalPrice)]
      : [
          'Rough price',
          job.estimate
            ? `${takaRange(job.estimate.min, job.estimate.max)} + parts`
            : 'You tell the price after checking',
        ],
  ];

  return (
    <div className="mx-auto grid max-w-4xl gap-5">
      {back}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-3xl font-extrabold">{job.serviceName}</h1>
        {job.emergency && job.status === 'requested' ? (
          <span className="rounded-full bg-alert-soft px-2.5 py-0.5 text-sm font-bold text-alert">
            Emergency · now
          </span>
        ) : (
          <StatusTag status={job.status} />
        )}
      </div>

      {errors.message && <Alert>{errors.message}</Alert>}

      <div className="grid gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-start">
        <div className="grid gap-5">
          <section className={cardClass} aria-label="The problem">
            {job.problem && (
              <>
                <p className="text-lg font-bold">{job.problem.summary ?? job.problem.text}</p>
                {job.problem.summary && (
                  <p className="text-sm text-muted">Customer wrote: “{job.problem.text}”</p>
                )}
              </>
            )}
            <dl className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-1.5 border-t border-line pt-3.5">
              {facts.map(([label, text]) => (
                <div key={label} className="contents">
                  <dt className="text-muted">{label}</dt>
                  <dd className="font-semibold">{text}</dd>
                </div>
              ))}
            </dl>
            {job.addressText === null && (
              <p className="flex items-start gap-2 text-sm text-muted">
                <ShieldCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                The full address and phone number show after you accept.
              </p>
            )}
          </section>

          {job.addressText !== null && job.status !== 'rejected' && job.status !== 'cancelled' && (
            <section className={cardClass} aria-label="Where to go">
              <div className="flex items-center gap-3">
                <div className="grid flex-1 leading-tight">
                  <b className="text-lg">{customer.name}</b>
                  {customer.phone && <span className="text-sm text-muted">{customer.phone}</span>}
                </div>
                {customer.phone && (
                  <a
                    href={`tel:${customer.phone}`}
                    className="inline-flex h-11 items-center gap-2 rounded-box border-[1.5px] border-line px-3 font-semibold text-pond hover:border-pond"
                  >
                    <Phone size={18} aria-hidden="true" />
                    Call
                  </a>
                )}
              </div>
              <dl className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-1.5">
                <dt className="text-muted">Address</dt>
                <dd className="font-semibold">{job.addressText}</dd>
                {job.note && (
                  <>
                    <dt className="text-muted">Note</dt>
                    <dd className="font-semibold">{job.note}</dd>
                  </>
                )}
              </dl>
            </section>
          )}
        </div>

        <div className="grid gap-5">
          {can('accepted') && (
            <section className={cardClass} aria-label="Your answer">
              <p className="font-semibold">Can you do this job?</p>
              <div className="grid grid-cols-2 gap-2.5">
                <Button variant="secondary" onClick={() => setConfirmReject(true)}>
                  Reject
                </Button>
                <Button loading={saving === 'accepted'} onClick={() => void moveTo('accepted')}>
                  Accept
                </Button>
              </div>
            </section>
          )}

          {next && can(next.to) && (
            <Button
              className="w-full"
              loading={saving === next.to}
              onClick={() => void moveTo(next.to)}
            >
              {next.label}
            </Button>
          )}

          {can('completed') && (
            <form className={cardClass} onSubmit={handleComplete} noValidate>
              <p className="font-semibold">Finished the work?</p>
              <TextField
                label="Final price paid in cash"
                inputMode="numeric"
                value={finalPrice}
                onChange={(event) => setFinalPrice(event.target.value.replace(/[^\d]/g, ''))}
                error={errors.fields.finalPrice}
                hint={`What ${customerFirst} paid you, parts included.`}
                addon="৳"
              />
              <Button type="submit" loading={saving === 'completed'}>
                Mark as completed
              </Button>
            </form>
          )}

          <section className={cardClass} aria-labelledby="progress-title">
            <h2 id="progress-title" className="text-xl font-bold">
              Progress
            </h2>
            <StatusTimeline booking={job} />
          </section>
        </div>
      </div>

      <ChatBox booking={job} viewer="technician" liveMessages={liveMessages} />

      {confirmReject && (
        <Modal
          title="Reject this job?"
          subtitle={`${customerFirst} will be told and can choose another karigor.`}
          onClose={closeReject}
        >
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="secondary" onClick={closeReject}>
              Go back
            </Button>
            <Button
              variant="danger"
              loading={saving === 'rejected'}
              onClick={() => void moveTo('rejected')}
            >
              Reject
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
