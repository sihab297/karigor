import { Ban, LoaderCircle, Search } from 'lucide-react';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Pager } from '../../components/admin/Pager';
import { StatusTag } from '../../components/bookings/StatusTag';
import { api } from '../../lib/api';
import { dhakaDateTime, type Booking } from '../../lib/bookings';
import { formErrorsFrom } from '../../lib/form-errors';
import { taka } from '../../lib/money';
import { useDocumentTitle } from '../../lib/use-document-title';
import type { AdminUser, Paged } from './admin-types';

type Tab = 'bookings' | 'users';

const BOOKING_FILTERS = [
  { label: 'All', statuses: '' },
  { label: 'Requested', statuses: 'requested' },
  { label: 'Active', statuses: 'accepted,on_the_way,arrived' },
  { label: 'Completed', statuses: 'completed' },
  { label: 'Cancelled', statuses: 'cancelled' },
  { label: 'Not accepted', statuses: 'rejected' },
];

const USER_FILTERS = [
  { label: 'All', query: '' },
  { label: 'Customers', query: 'role=customer' },
  { label: 'Technicians', query: 'role=technician' },
  { label: 'Blocked', query: 'status=blocked' },
];

const chip = (on: boolean) =>
  `rounded-box border-[1.5px] px-3 py-1.5 text-sm font-semibold ${
    on ? 'border-tea bg-turmeric-soft' : 'border-line bg-white hover:border-tea'
  }`;

function SearchBox({ label, onSearch }: { label: string; onSearch: (q: string) => void }) {
  const id = useId();
  const [text, setText] = useState('');
  return (
    <form
      className="flex gap-2"
      role="search"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        onSearch(text.trim());
      }}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <span className="flex h-12 flex-1 items-center gap-2 rounded-box border-[1.5px] border-line bg-white px-3 focus-within:border-tea">
        <Search size={18} className="text-muted" aria-hidden="true" />
        <input
          id={id}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={label}
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted/70"
        />
      </span>
      <Button type="submit" variant="secondary">
        Search
      </Button>
    </form>
  );
}

function useList<T>(path: string) {
  const [data, setData] = useState<(Paged & T) | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let stillHere = true;
    api<Paged & T>(path)
      .then((result) => {
        if (!stillHere) return;
        setData(result);
        setError('');
      })
      .catch((err: unknown) => {
        if (stillHere) setError(formErrorsFrom(err).message || "Couldn't load the list.");
      });
    return () => {
      stillHere = false;
    };
  }, [path, reload]);
  return { data, error, refresh: () => setReload((n) => n + 1) };
}

function BookingsPanel() {
  const [filter, setFilter] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page) });
  if (filter) params.set('status', filter);
  if (q) params.set('q', q);
  const { data, error } = useList<{ bookings: Booking[] }>(`/admin/bookings?${params}`);

  return (
    <div className="grid gap-4">
      <SearchBox
        label="Search name, phone or booking number"
        onSearch={(text) => {
          setQ(text);
          setPage(1);
        }}
      />
      <div className="flex flex-wrap gap-1.5" aria-label="Filter by status" role="group">
        {BOOKING_FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            aria-pressed={filter === f.statuses}
            className={chip(filter === f.statuses)}
            onClick={() => {
              setFilter(f.statuses);
              setPage(1);
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
      {error && <Alert>{error}</Alert>}
      {!data ? (
        <div className="grid place-items-center py-10 text-muted">
          <LoaderCircle className="animate-spin" aria-label="Loading bookings" />
        </div>
      ) : (
        <>
          <ul
            className="grid divide-y divide-line rounded-box border border-line bg-white"
            aria-label="Bookings"
          >
            {data.bookings.length === 0 && (
              <li className="px-4 py-4 text-muted">No bookings found.</li>
            )}
            {data.bookings.map((booking) => (
              <li
                key={booking.id}
                className="grid gap-1 px-4 py-3 md:grid-cols-[1.2fr_1.6fr_1fr_auto] md:items-center md:gap-3"
              >
                <span className="font-semibold">
                  #{booking.id.slice(-6).toUpperCase()} · {booking.serviceName}
                  {booking.emergency && (
                    <span className="ml-2 rounded-full bg-alert-soft px-2 py-0.5 text-xs font-bold text-alert">
                      Emergency
                    </span>
                  )}
                </span>
                <span className="text-sm">
                  {booking.customer.name} → {booking.technician.name}
                </span>
                <span className="text-sm text-muted">
                  {dhakaDateTime(booking.scheduledAt)}
                  {booking.finalPrice !== null && ` · ${taka(booking.finalPrice)}`}
                </span>
                <span>
                  <StatusTag status={booking.status} />
                </span>
              </li>
            ))}
          </ul>
          <Pager paged={data} onPage={setPage} />
        </>
      )}
    </div>
  );
}

const ROLE_NAMES = { customer: 'Customer', technician: 'Technician', admin: 'Admin' };

function UsersPanel() {
  const [filter, setFilter] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [confirming, setConfirming] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');
  const params = new URLSearchParams(filter);
  params.set('page', String(page));
  if (q) params.set('q', q);
  const { data, error, refresh } = useList<{ users: AdminUser[] }>(`/admin/users?${params}`);

  async function setStatus(user: AdminUser, status: 'active' | 'blocked') {
    setSaving(user.id);
    setSaveError('');
    try {
      await api(`/admin/users/${user.id}/status`, { method: 'PATCH', body: { status } });
      setConfirming(null);
      refresh();
    } catch (err) {
      setSaveError(formErrorsFrom(err).message);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="grid gap-4">
      <SearchBox
        label="Search name, phone or email"
        onSearch={(text) => {
          setQ(text);
          setPage(1);
        }}
      />
      <div className="flex flex-wrap gap-1.5" aria-label="Filter users" role="group">
        {USER_FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            aria-pressed={filter === f.query}
            className={chip(filter === f.query)}
            onClick={() => {
              setFilter(f.query);
              setPage(1);
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
      {(error || saveError) && <Alert>{error || saveError}</Alert>}
      {!data ? (
        <div className="grid place-items-center py-10 text-muted">
          <LoaderCircle className="animate-spin" aria-label="Loading users" />
        </div>
      ) : (
        <>
          <ul
            className="grid divide-y divide-line rounded-box border border-line bg-white"
            aria-label="Users"
          >
            {data.users.length === 0 && <li className="px-4 py-4 text-muted">No users found.</li>}
            {data.users.map((user) => (
              <li
                key={user.id}
                className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${
                  user.status === 'blocked' ? 'bg-paper' : ''
                }`}
              >
                <span className="grid">
                  <span className="font-semibold">
                    {user.name}
                    {user.status === 'blocked' && (
                      <span className="ml-2 rounded-full bg-alert-soft px-2 py-0.5 text-xs font-bold text-alert">
                        Blocked
                      </span>
                    )}
                  </span>
                  <span className="text-sm text-muted">
                    {ROLE_NAMES[user.role]} · {user.phone}
                    {user.role !== 'admin' &&
                      ` · ${user.bookings} ${user.role === 'technician' ? 'jobs' : 'bookings'}`}
                  </span>
                </span>
                {user.role !== 'admin' &&
                  (user.status === 'blocked' ? (
                    <Button
                      variant="secondary"
                      className="h-10 px-3 text-sm"
                      loading={saving === user.id}
                      onClick={() => void setStatus(user, 'active')}
                    >
                      Unblock
                    </Button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirming(user)}
                      className="inline-flex h-10 items-center gap-1.5 rounded-box border-[1.5px] border-alert px-3 text-sm font-bold text-alert hover:bg-alert-soft"
                    >
                      <Ban size={16} aria-hidden="true" />
                      Block
                    </button>
                  ))}
              </li>
            ))}
          </ul>
          <Pager paged={data} onPage={setPage} />
        </>
      )}

      {confirming && (
        <Modal
          title={`Block ${confirming.name}?`}
          subtitle="They are logged out at once and can't log in, book or take jobs. Their old bookings stay in the records. You can unblock them later."
          onClose={() => setConfirming(null)}
        >
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="secondary" onClick={() => setConfirming(null)}>
              Go back
            </Button>
            <Button
              variant="danger"
              loading={saving === confirming.id}
              onClick={() => void setStatus(confirming, 'blocked')}
            >
              Block
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function AdminBookingsPage() {
  useDocumentTitle('Bookings and users');
  const [tab, setTab] = useState<Tab>('bookings');
  const tabClass = (on: boolean) =>
    `h-10 flex-1 rounded-lg font-semibold ${on ? 'bg-white text-tea shadow-sm' : 'text-muted hover:text-tea'}`;

  return (
    <div className="mx-auto grid max-w-5xl gap-5">
      <h1 className="text-3xl font-extrabold">Bookings and users</h1>
      <div
        role="tablist"
        aria-label="Show"
        className="flex max-w-md gap-1 rounded-box bg-[#ece8df] p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'bookings'}
          className={tabClass(tab === 'bookings')}
          onClick={() => setTab('bookings')}
        >
          Bookings
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'users'}
          className={tabClass(tab === 'users')}
          onClick={() => setTab('users')}
        >
          Users
        </button>
      </div>
      {tab === 'bookings' ? <BookingsPanel /> : <UsersPanel />}
    </div>
  );
}
