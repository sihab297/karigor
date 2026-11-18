import { CalendarDays, LoaderCircle, MapPin, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { Stars } from '../../components/bookings/ReviewCard';
import { ServiceIcon } from '../../components/ServiceIcon';
import { api, ApiError } from '../../lib/api';
import { describeDays } from '../../lib/days';
import { formErrorsFrom } from '../../lib/form-errors';
import { formatTime } from '../../lib/time';
import { useDocumentTitle } from '../../lib/use-document-title';

interface PublicTechnician {
  id: string;
  name: string;
  areaName: string;
  experienceYears: number;
  rating: number | null;
  ratingCount: number;
  jobsDone: number;
  services: {
    id: string;
    name: string;
    jobsDone: number;
    skills: { id: string; name: string }[];
  }[];
  workingDays: number[];
  workingHours: { start: string; end: string };
  acceptingJobs: boolean;
  memberSince: string;
}

interface PublicReview {
  id: string;
  rating: number;
  comment: string;
  serviceName: string;
  at: string;
  customerName: string;
}

const cardClass = 'grid gap-3 rounded-box border border-line bg-white p-4 sm:p-5';

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

const shortDate = (value: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(value),
  );

export default function TechnicianPublicPage() {
  const { id = '' } = useParams();
  const [tech, setTech] = useState<PublicTechnician | null>(null);
  const [reviews, setReviews] = useState<{ total: number; reviews: PublicReview[] } | null>(null);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useDocumentTitle(tech ? tech.name : 'Karigor profile');

  useEffect(() => {
    let stillHere = true;
    Promise.all([
      api<{ technician: PublicTechnician }>(`/technicians/${id}`),
      api<{ total: number; reviews: PublicReview[] }>(`/technicians/${id}/reviews`),
    ])
      .then(([profile, list]) => {
        if (!stillHere) return;
        setTech(profile.technician);
        setReviews(list);
      })
      .catch((err: unknown) => {
        if (!stillHere) return;
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(formErrorsFrom(err).message || "Couldn't load this profile.");
      });
    return () => {
      stillHere = false;
    };
  }, [id, attempt]);

  if (notFound) {
    return (
      <div className="mx-auto grid max-w-2xl gap-3">
        <h1 className="text-3xl font-extrabold">We couldn't find this karigor</h1>
        <p className="text-muted">The link may be wrong, or the profile is not open right now.</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="mx-auto grid max-w-md gap-4">
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
    );
  }
  if (!tech || !reviews) {
    return (
      <div className="grid place-items-center py-20 text-muted">
        <LoaderCircle className="animate-spin" aria-label="Loading the profile" />
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-[320px_minmax(0,1fr)] md:items-start">
      <section className={`${cardClass} justify-items-center text-center md:sticky md:top-24`}>
        <span
          aria-hidden="true"
          className="grid size-20 place-items-center rounded-full bg-pond-soft font-heading text-2xl font-bold text-pond"
        >
          {initials(tech.name)}
        </span>
        <h1 className="text-3xl font-extrabold leading-tight">{tech.name}</h1>
        <span className="inline-flex items-center gap-1 rounded-full bg-pond-soft px-2.5 py-0.5 text-sm font-bold text-pond">
          <ShieldCheck size={15} aria-hidden="true" />
          NID checked by Karigor
        </span>
        <span className="inline-flex items-center gap-1 text-muted">
          <MapPin size={16} aria-hidden="true" />
          Works around {tech.areaName}
        </span>
        <dl className="grid w-full grid-cols-3 gap-2">
          <div className="rounded-lg bg-paper px-2 py-1.5">
            <dt className="text-xs text-muted">Rating</dt>
            <dd className="font-bold">
              {tech.rating === null ? 'New' : `${tech.rating} ★`}
              {tech.rating !== null && (
                <span className="block text-xs font-normal text-muted">
                  {tech.ratingCount} reviews
                </span>
              )}
            </dd>
          </div>
          <div className="rounded-lg bg-paper px-2 py-1.5">
            <dt className="text-xs text-muted">Jobs done</dt>
            <dd className="font-bold">{tech.jobsDone}</dd>
          </div>
          <div className="rounded-lg bg-paper px-2 py-1.5">
            <dt className="text-xs text-muted">Experience</dt>
            <dd className="font-bold">
              {tech.experienceYears === 0 ? 'Under 1 yr' : `${tech.experienceYears} yrs`}
            </dd>
          </div>
        </dl>
        {!tech.acceptingJobs && (
          <p className="text-sm text-muted">Not taking new jobs right now.</p>
        )}
      </section>

      <div className="grid gap-5">
        <section className={cardClass} aria-labelledby="skills-title">
          <h2 id="skills-title" className="text-xl font-bold">
            Services and skills
          </h2>
          <ul className="grid gap-3">
            {tech.services.map((service) => (
              <li key={service.id} className="grid gap-2">
                <span className="flex items-center gap-2 font-semibold">
                  <span className="grid size-8 place-items-center rounded-full bg-turmeric-soft">
                    <ServiceIcon serviceId={service.id} size={16} />
                  </span>
                  {service.name}
                  <span className="text-sm font-normal text-muted">
                    · {service.jobsDone} {service.jobsDone === 1 ? 'job' : 'jobs'} done
                  </span>
                </span>
                <ul className="flex flex-wrap gap-1.5" aria-label={`${service.name} skills`}>
                  {service.skills.map((skill) => (
                    <li
                      key={skill.id}
                      className="rounded-box border-[1.5px] border-line px-2.5 py-1 text-sm font-semibold"
                    >
                      {skill.name}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <p className="flex items-center gap-2 border-t border-line pt-3 text-sm">
            <CalendarDays size={16} className="text-muted" aria-hidden="true" />
            Works {describeDays(tech.workingDays)}, {formatTime(tech.workingHours.start)} to{' '}
            {formatTime(tech.workingHours.end)}
          </p>
        </section>

        <section className={cardClass} aria-labelledby="reviews-title">
          <h2 id="reviews-title" className="flex items-baseline justify-between text-xl font-bold">
            Reviews
            <span className="text-sm font-normal text-muted">{reviews.total}</span>
          </h2>
          {reviews.reviews.length === 0 ? (
            <p className="text-muted">
              {tech.ratingCount > 0
                ? 'No written reviews to show yet. The rating above comes from star ratings.'
                : `No reviews yet. ${tech.name.split(' ')[0]} is new on Karigor and was checked by our admin.`}
            </p>
          ) : (
            <ul className="grid divide-y divide-line">
              {reviews.reviews.map((review) => (
                <li key={review.id} className="grid gap-1 py-3 first:pt-0 last:pb-0">
                  <span className="flex items-center justify-between gap-3">
                    <b>{review.customerName}</b>
                    <Stars rating={review.rating} size={16} />
                  </span>
                  {review.comment && <p>{review.comment}</p>}
                  <span className="text-sm text-muted">
                    {review.serviceName} · {shortDate(review.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {reviews.total > reviews.reviews.length && (
            <p className="text-sm text-muted">Showing the latest {reviews.reviews.length}.</p>
          )}
        </section>
      </div>
    </div>
  );
}
