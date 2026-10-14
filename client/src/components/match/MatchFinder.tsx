import { TriangleAlert } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { slotIso, whenLabel, type Slot } from '../../lib/dhaka-time';
import { formErrorsFrom, noErrors, type FormErrors } from '../../lib/form-errors';
import { nearestArea } from '../../lib/geo';
import type { Match, MatchResult } from '../../pages/customer/problem-types';
import type { Area, LatLng } from '../../pages/technician/profile-types';
import { Alert } from '../Alert';
import { Button } from '../Button';
import { BookDialog } from './BookDialog';
import { HomePin } from './HomePin';
import { TechnicianCard } from './TechnicianCard';
import { WhenPicker } from './WhenPicker';

interface MatchFinderProps {
  reportId: string;
  serviceId: string;
  serviceName: string;
  emergency: boolean;
  price: string | null;
  onShowMatches: (shown: boolean) => void;
}

const linkClass = 'font-bold text-pond underline underline-offset-2';

export function MatchFinder({
  reportId,
  serviceId,
  serviceName,
  emergency,
  price,
  onShowMatches,
}: MatchFinderProps) {
  const [now] = useState(() => new Date());
  const [areas, setAreas] = useState<Area[]>([]);
  const [point, setPoint] = useState<LatLng | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [later, setLater] = useState(false);
  const [finding, setFinding] = useState(false);
  const [errors, setErrors] = useState<FormErrors>(noErrors);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [booking, setBooking] = useState<Match | null>(null);
  const closeBooking = useCallback(() => setBooking(null), []);
  const whenRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let stillHere = true;
    api<{ areas: Area[] }>('/areas')
      .then((data) => stillHere && setAreas(data.areas))
      .catch(() => undefined);
    return () => {
      stillHere = false;
    };
  }, []);

  // a result for another service (the customer changed it) no longer counts
  const shown = result?.serviceId === serviceId ? result : null;

  useEffect(() => {
    if (shown) resultsRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [shown]);

  const rightNow = emergency && !later;
  const near = point ? (nearestArea(point, areas)?.name ?? 'Dhaka') : '';

  function clearResult() {
    setResult(null);
    setErrors(noErrors);
    onShowMatches(false);
  }

  function showPicker() {
    whenRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    whenRef.current?.querySelector('button')?.focus();
  }

  async function handleFind(event: FormEvent) {
    event.preventDefault();
    const fields: Record<string, string> = {};
    if (!point) fields.location = 'Pin your home first: choose your area or use your location.';
    if (!rightNow && !slot) fields.when = 'Pick a day and a time.';
    if (Object.keys(fields).length > 0) {
      setErrors({ fields, message: '' });
      return;
    }

    setFinding(true);
    setErrors(noErrors);
    try {
      const data = await api<MatchResult>(`/problems/${reportId}/matches`, {
        method: 'POST',
        body: { location: point, ...(rightNow ? {} : { when: slotIso(slot!) }) },
      });
      setResult(data);
      onShowMatches(data.matches.length > 0);
    } catch (error) {
      setErrors(formErrorsFrom(error));
    } finally {
      setFinding(false);
    }
  }

  const count = shown?.matches.length ?? 0;
  const when = shown ? (shown.emergency ? 'Right now' : whenLabel(shown.when, now)) : '';

  return (
    <>
      <form
        onSubmit={handleFind}
        noValidate
        className="grid gap-5 rounded-box border border-line bg-white p-4 sm:p-5"
      >
        <div className="grid gap-1">
          <h2 className="text-2xl font-bold">Where and when?</h2>
          <p className="text-muted">
            Pin your home, pick a time, and we'll show the 3 best karigors near you.
          </p>
        </div>

        <HomePin
          areas={areas}
          value={point}
          onChange={(next) => {
            setPoint(next);
            clearResult();
          }}
          error={errors.fields.location}
        />

        {rightNow ? (
          <div className="flex items-start gap-2.5 rounded-box bg-alert-soft px-3.5 py-3 text-alert-ink">
            <TriangleAlert size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>
              <b className="block">Right now</b>
              Because this is an emergency, we look for karigors within 5 km who are free right now.{' '}
              <button
                type="button"
                className={linkClass}
                onClick={() => {
                  setLater(true);
                  clearResult();
                }}
              >
                Book for later instead
              </button>
            </p>
          </div>
        ) : (
          <WhenPicker
            ref={whenRef}
            value={slot}
            now={now}
            onChange={(next) => {
              setSlot(next);
              clearResult();
            }}
            error={errors.fields.when}
          />
        )}

        {errors.message && <Alert>{errors.message}</Alert>}

        <Button type="submit" loading={finding} className="w-full text-[17px]">
          {rightNow ? 'Find karigors free right now' : 'Show the best karigors'}
        </Button>
      </form>

      {shown && (
        <section ref={resultsRef} aria-live="polite" className="grid scroll-mt-4 gap-3">
          {count === 0 ? (
            <div className="grid gap-2.5 rounded-box border border-dashed border-line bg-white p-4 sm:p-5">
              <h2 className="text-[21px] font-bold">
                Nobody is free {shown.emergency ? 'right now' : 'then'}
              </h2>
              {shown.emergency ? (
                <p className="text-muted">
                  No {serviceName.toLowerCase()} within 5 km is free right now. If it's dangerous,
                  call 999. You can also book someone for later.
                </p>
              ) : (
                <p className="text-muted">
                  No {serviceName.toLowerCase()} near you works on {when}. Try another time or day.
                </p>
              )}
              <Button
                variant="secondary"
                className="justify-self-start"
                onClick={() => {
                  if (shown.emergency) {
                    setLater(true);
                    clearResult();
                  } else {
                    showPicker();
                  }
                }}
              >
                {shown.emergency ? 'Book for later' : 'Pick another time'}
              </Button>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-2xl font-bold">
                  {count === 1 ? 'The best karigor' : `The ${count} best karigors`} for you
                </h2>
                <p className="text-muted">
                  {serviceName} · {when} · within {shown.searchedKm} km
                </p>
              </div>
              <div className="grid gap-4 pt-2">
                {shown.matches.map((match) => (
                  <TechnicianCard
                    key={match.technicianId}
                    match={match}
                    onBook={() => setBooking(match)}
                  />
                ))}
              </div>
              <p className="text-sm text-muted">
                Not happy with these? Try another time, or move the pin.
              </p>
            </>
          )}
        </section>
      )}

      {booking && shown && (
        <BookDialog
          match={booking}
          serviceName={serviceName}
          when={when}
          near={near}
          price={price}
          onClose={closeBooking}
        />
      )}
    </>
  );
}
