import { ChevronRight, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { api } from '../../lib/api';
import type { BookingStatus } from '../../lib/bookings';
import { formErrorsFrom } from '../../lib/form-errors';
import { useDocumentTitle } from '../../lib/use-document-title';

interface AdminStats {
  users: { customers: number; newCustomersThisWeek: number; technicians: number };
  technicians: { waiting: number; approved: number; rejected: number; takingJobs: number };
  bookings: {
    today: number;
    emergenciesToday: number;
    thisMonthByStatus: { status: BookingStatus; count: number }[];
    thisMonthByService: { serviceId: string; serviceName: string; count: number }[];
  };
  problemChecksThisMonth: number;
}

const STATUS_NAMES: Record<BookingStatus, string> = {
  requested: 'Requested',
  accepted: 'Accepted',
  on_the_way: 'On the way',
  arrived: 'Arrived',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Not accepted',
};

function Tile({
  label,
  value,
  note,
  highlight = false,
  to,
}: {
  label: string;
  value: number;
  note: string;
  highlight?: boolean;
  to?: string;
}) {
  const body = (
    <>
      <span className={`text-sm ${highlight ? 'font-bold' : 'text-muted'}`}>{label}</span>
      <span className="font-heading text-4xl font-extrabold leading-none">{value}</span>
      <span
        className={`flex items-center gap-0.5 text-sm ${highlight ? 'font-bold' : 'text-muted'}`}
      >
        {note}
        {to && <ChevronRight size={15} aria-hidden="true" />}
      </span>
    </>
  );
  const className = `grid gap-1.5 rounded-box border p-4 ${
    highlight ? 'border-turmeric-dark bg-turmeric-soft' : 'border-line bg-white'
  }`;
  return to ? (
    <Link to={to} className={`${className} hover:border-tea`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

// one series of counts as horizontal bars: same colour for every bar, value in text beside it
function BarList({ title, rows }: { title: string; rows: { label: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return (
    <section className="grid content-start gap-3 rounded-box border border-line bg-white p-4 sm:p-5">
      <h2 className="flex items-baseline justify-between gap-3 text-lg font-bold">
        {title}
        <span className="text-sm font-normal text-muted">{total} in total</span>
      </h2>
      <ul className="grid gap-2.5" aria-label={title}>
        {rows.map((row) => (
          <li
            key={row.label}
            className="grid grid-cols-[7.5rem_minmax(0,1fr)_2.5rem] items-center gap-3 text-sm"
          >
            <span>{row.label}</span>
            <span className="h-2.5 rounded-r-[4px] bg-paper" aria-hidden="true">
              {row.count > 0 && (
                <span
                  className="block h-full rounded-r-[4px] bg-pond"
                  style={{ width: `${(row.count / max) * 100}%` }}
                />
              )}
            </span>
            <span className="text-right font-bold tabular-nums">
              <span className="sr-only">{row.label}: </span>
              {row.count}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const today = () =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

export default function AdminDashboardPage() {
  useDocumentTitle('Dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stillHere = true;
    api<AdminStats>('/admin/stats')
      .then((data) => stillHere && setStats(data))
      .catch((err: unknown) => {
        if (stillHere) setError(formErrorsFrom(err).message || "Couldn't load the numbers.");
      });
    return () => {
      stillHere = false;
    };
  }, [attempt]);

  return (
    <div className="mx-auto grid max-w-5xl gap-5">
      <div>
        <h1 className="text-3xl font-extrabold">Dashboard</h1>
        <p className="text-muted">{today()}</p>
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
      ) : !stats ? (
        <div className="grid place-items-center py-16 text-muted">
          <LoaderCircle className="animate-spin" aria-label="Loading the dashboard" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile
              label="Customers"
              value={stats.users.customers}
              note={`+${stats.users.newCustomersThisWeek} this week`}
            />
            <Tile
              label="Technicians"
              value={stats.users.technicians}
              note={`${stats.technicians.takingJobs} taking jobs`}
            />
            <Tile
              label="Waiting for approval"
              value={stats.technicians.waiting}
              note={stats.technicians.waiting > 0 ? 'Review now' : 'Nobody waiting'}
              highlight={stats.technicians.waiting > 0}
              to="/admin/technicians"
            />
            <Tile
              label="Bookings today"
              value={stats.bookings.today}
              note={
                stats.bookings.emergenciesToday === 1
                  ? '1 emergency'
                  : `${stats.bookings.emergenciesToday} emergencies`
              }
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <BarList
              title="Bookings this month by status"
              rows={stats.bookings.thisMonthByStatus.map((row) => ({
                label: STATUS_NAMES[row.status],
                count: row.count,
              }))}
            />
            <BarList
              title="Bookings this month by service"
              rows={stats.bookings.thisMonthByService.map((row) => ({
                label: row.serviceName,
                count: row.count,
              }))}
            />
          </div>

          <p className="text-sm text-muted">
            {stats.problemChecksThisMonth} problem checks this month · {stats.technicians.approved}{' '}
            approved and {stats.technicians.rejected} not approved technicians
          </p>
        </>
      )}
    </div>
  );
}
