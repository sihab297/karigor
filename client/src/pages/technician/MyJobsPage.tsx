import { CalendarClock, LoaderCircle, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { StatusTag } from '../../components/bookings/StatusTag';
import { ServiceIcon } from '../../components/ServiceIcon';
import { Switch } from '../../components/Switch';
import { api } from '../../lib/api';
import { dhakaDateTime, type Booking, type BookingStatus } from '../../lib/bookings';
import { formErrorsFrom } from '../../lib/form-errors';
import { taka, takaRange } from '../../lib/money';
import { useDocumentTitle } from '../../lib/use-document-title';
import type { TechnicianProfile } from './profile-types';
import { useWorkArea } from './use-work-area';

type Tab = 'new' | 'upcoming' | 'done';

const TAB_STATUSES: Record<Tab, BookingStatus[]> = {
  new: ['requested'],
  upcoming: ['accepted', 'on_the_way', 'arrived'],
  done: ['completed', 'rejected', 'cancelled'],
};

const TAB_LABELS: Record<Tab, string> = { new: 'New', upcoming: 'Upcoming', done: 'Done' };

function JobCard({ job, place }: { job: Booking; place: string }) {
  const urgent = job.emergency && job.status === 'requested';
  const price =
    job.finalPrice !== null
      ? taka(job.finalPrice)
      : job.estimate
        ? takaRange(job.estimate.min, job.estimate.max)
        : 'Price after checking';
  return (
    <li>
      <Link
        to={`/tech/jobs/${job.id}`}
        className={`grid gap-2.5 rounded-box border bg-white p-4 hover:border-tea ${
          urgent ? 'border-[1.5px] border-alert' : 'border-line'
        }`}
      >
        <span className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2.5 font-semibold">
            <span
              className={`grid size-9 place-items-center rounded-full ${
                urgent ? 'bg-alert-soft text-alert' : 'bg-turmeric-soft'
              }`}
            >
              <ServiceIcon serviceId={job.serviceId} size={18} />
            </span>
            {job.serviceName}
          </span>
          {urgent ? (
            <span className="rounded-full bg-alert-soft px-2.5 py-0.5 text-sm font-bold text-alert">
              Emergency · now
            </span>
          ) : (
            <StatusTag status={job.status} />
          )}
        </span>
        {job.problem && (
          <span className="line-clamp-2 font-semibold">
            {job.problem.summary ?? job.problem.text}
          </span>
        )}
        <span className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          {place && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={15} aria-hidden="true" />
              {place}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <CalendarClock size={15} aria-hidden="true" />
            {urgent ? 'Right now' : dhakaDateTime(job.scheduledAt)}
          </span>
        </span>
        <span className="flex items-center justify-between gap-3">
          <b>{price}</b>
          <span className="text-sm font-semibold text-pond underline underline-offset-2">
            {job.status === 'requested' ? 'View request' : 'Open job'}
          </span>
        </span>
      </Link>
    </li>
  );
}

function TakingJobs({
  profile,
  onChange,
}: {
  profile: TechnicianProfile | null;
  onChange: (profile: TechnicianProfile) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  if (!profile) return null;

  if (profile.approvalStatus !== 'approved') {
    return (
      <div className="rounded-box bg-turmeric-soft px-4 py-3.5">
        <b>Not approved yet.</b> You'll get job requests once the admin approves your profile.{' '}
        <Link to="/tech/profile" className="font-semibold text-pond underline underline-offset-2">
          See my profile
        </Link>
      </div>
    );
  }

  async function toggle(acceptingJobs: boolean) {
    setSaving(true);
    setError('');
    try {
      const data = await api<{ profile: TechnicianProfile }>('/technicians/me/availability', {
        method: 'PATCH',
        body: { acceptingJobs },
      });
      onChange(data.profile);
    } catch (err) {
      setError(formErrorsFrom(err).message || "Couldn't change this. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-box border border-[#bfdcd3] bg-pond-soft px-4 py-3.5">
        <p>
          {profile.acceptingJobs
            ? `Customers near ${profile.areaName} can book you.`
            : "You're not taking jobs right now, so customers won't see you."}
        </p>
        <Switch
          label="Taking jobs"
          checked={profile.acceptingJobs}
          onChange={toggle}
          disabled={saving}
        />
      </div>
      {error && <Alert>{error}</Alert>}
    </div>
  );
}

export default function MyJobsPage() {
  useDocumentTitle('My jobs');
  const { profile, setProfile, describePlace } = useWorkArea();
  const [jobs, setJobs] = useState<Booking[] | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<Tab>('new');

  useEffect(() => {
    let stillHere = true;
    api<{ bookings: Booking[] }>('/bookings')
      .then((data) => stillHere && setJobs(data.bookings))
      .catch((err: unknown) => {
        if (stillHere) setError(formErrorsFrom(err).message || "Couldn't load your jobs.");
      });
    return () => {
      stillHere = false;
    };
  }, [attempt]);

  const inTab = (t: Tab) => jobs?.filter((job) => TAB_STATUSES[t].includes(job.status)) ?? [];
  // new requests: emergencies first, then the soonest; done: the latest first
  const shown = [...inTab(tab)].sort((a, b) => {
    if (tab === 'new' && a.emergency !== b.emergency) return a.emergency ? -1 : 1;
    const diff = new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    return tab === 'done' ? -diff : diff;
  });
  const tabClass = (on: boolean) =>
    `-mb-px border-b-[3px] px-1 pb-2.5 pt-2 font-semibold ${
      on ? 'border-turmeric text-tea' : 'border-transparent text-muted hover:text-tea'
    }`;
  const emptyText: Record<Tab, string> = {
    new: 'No new requests right now. They show up here when a customer books you.',
    upcoming: 'No upcoming jobs. Jobs you accept show up here.',
    done: 'Finished, cancelled and declined jobs show up here.',
  };

  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <h1 className="text-3xl font-extrabold">My jobs</h1>
      <TakingJobs profile={profile} onChange={setProfile} />

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
      ) : !jobs ? (
        <div className="grid place-items-center py-16 text-muted">
          <LoaderCircle className="animate-spin" aria-label="Loading your jobs" />
        </div>
      ) : (
        <>
          <div role="tablist" aria-label="Jobs" className="flex gap-5 border-b border-line">
            {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                className={tabClass(tab === t)}
                onClick={() => setTab(t)}
              >
                {TAB_LABELS[t]} ({inTab(t).length})
              </button>
            ))}
          </div>

          {shown.length > 0 ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {shown.map((job) => (
                <JobCard key={job.id} job={job} place={describePlace(job.location)} />
              ))}
            </ul>
          ) : (
            <p className="rounded-box border border-dashed border-line bg-white p-5 text-muted">
              {emptyText[tab]}
            </p>
          )}
          {tab === 'new' && shown.length > 0 && (
            <p className="text-center text-sm text-muted">
              Reply soon. If you don't, the customer can choose another karigor.
            </p>
          )}
        </>
      )}
    </div>
  );
}
