import { Check, X } from 'lucide-react';
import { dhakaDateTime, JOB_STEPS, type Booking } from '../../lib/bookings';

export function StatusTimeline({ booking }: { booking: Booking }) {
  const reachedAt = new Map(booking.statusHistory.map((change) => [change.status, change.at]));
  const stopped = booking.status === 'cancelled' || booking.status === 'rejected';
  const stoppedAt = stopped ? reachedAt.get(booking.status) : undefined;
  const lastReached = Math.max(
    ...JOB_STEPS.map((step, i) => (reachedAt.has(step.status) ? i : -1)),
  );
  // a stopped booking shows only the steps it reached
  const steps = stopped ? JOB_STEPS.slice(0, lastReached + 1) : JOB_STEPS;

  return (
    <ol className="grid" aria-label="Booking progress">
      {steps.map((step, index) => {
        const at = reachedAt.get(step.status);
        const now = !stopped && index === lastReached && step.status !== 'completed';
        const done = at !== undefined && !now;
        const isLast = index === steps.length - 1 && !stopped;
        return (
          <li
            key={step.status}
            className="relative grid grid-cols-[26px_1fr_auto] gap-2.5 pb-3.5 last:pb-0"
          >
            {!isLast && (
              <span
                aria-hidden="true"
                className={`absolute left-3 top-6 -bottom-0.5 w-0.5 ${done ? 'bg-pond' : 'bg-line'}`}
              />
            )}
            <span
              aria-hidden="true"
              className={`z-10 grid size-[26px] place-items-center rounded-full border-2 ${
                done
                  ? 'border-pond bg-pond text-white'
                  : now
                    ? 'border-turmeric-dark bg-turmeric-soft'
                    : 'border-line bg-white'
              }`}
            >
              {done && <Check size={14} strokeWidth={3} />}
              {now && <span className="size-2.5 rounded-full bg-turmeric-dark" />}
            </span>
            <span className={`pt-0.5 leading-tight ${at ? 'font-semibold' : 'text-muted'}`}>
              {step.label}
              {now && <span className="sr-only"> (now)</span>}
            </span>
            {at && <time className="pt-1 text-sm text-muted">{dhakaDateTime(at)}</time>}
          </li>
        );
      })}
      {stopped && (
        <li className="grid grid-cols-[26px_1fr_auto] gap-2.5">
          <span
            aria-hidden="true"
            className={`z-10 grid size-[26px] place-items-center rounded-full ${
              booking.status === 'rejected' ? 'bg-alert text-white' : 'bg-muted text-white'
            }`}
          >
            <X size={14} strokeWidth={3} />
          </span>
          <span className="pt-0.5 font-semibold leading-tight">
            {booking.status === 'rejected' ? 'Not accepted' : 'Cancelled'}
            {booking.cancelReason && (
              <span className="block text-sm font-normal text-muted">“{booking.cancelReason}”</span>
            )}
          </span>
          {stoppedAt && <time className="pt-1 text-sm text-muted">{dhakaDateTime(stoppedAt)}</time>}
        </li>
      )}
    </ol>
  );
}
