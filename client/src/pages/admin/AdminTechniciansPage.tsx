import { Check, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { NidPhotoDialog } from '../../components/admin/NidPhotoDialog';
import { TechnicianReviewCard } from '../../components/admin/TechnicianReviewCard';
import { api } from '../../lib/api';
import { serviceNames } from '../../lib/catalog';
import { formErrorsFrom } from '../../lib/form-errors';
import { useDocumentTitle } from '../../lib/use-document-title';
import type { Service } from '../technician/profile-types';
import type { AdminTechnician, ApprovalTab, TechnicianList } from './admin-types';

const tabs: { value: ApprovalTab; label: string; empty: string }[] = [
  {
    value: 'pending',
    label: 'Waiting',
    empty: 'No technicians waiting. New sign-ups will show up here.',
  },
  { value: 'approved', label: 'Approved', empty: 'No approved technicians yet.' },
  { value: 'rejected', label: 'Rejected', empty: 'No rejected technicians.' },
];

export default function AdminTechniciansPage() {
  useDocumentTitle('Technicians');
  const [params, setParams] = useSearchParams();
  const tab = (tabs.find((t) => t.value === params.get('tab'))?.value ?? 'pending') as ApprovalTab;

  const [list, setList] = useState<TechnicianList | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [busyId, setBusyId] = useState('');
  const [rejectingId, setRejectingId] = useState('');
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState('');
  const [viewing, setViewing] = useState<AdminTechnician | null>(null);

  useEffect(() => {
    let stillHere = true;
    Promise.all([
      api<TechnicianList>(`/admin/technicians?status=${tab}`),
      api<{ services: Service[] }>('/services'),
    ])
      .then(([data, catalog]) => {
        if (!stillHere) return;
        setList(data);
        setServices(catalog.services);
        setLoadError('');
      })
      .catch((error: unknown) => {
        if (stillHere) setLoadError(formErrorsFrom(error).message);
      });
    return () => {
      stillHere = false;
    };
  }, [tab, attempt]);

  function openTab(value: ApprovalTab) {
    setList(null);
    setDone('');
    setRejectingId('');
    setParams(value === 'pending' ? {} : { tab: value });
  }

  async function review(technician: AdminTechnician, body: object, message: string) {
    setBusyId(technician.userId);
    setCardErrors((errors) => ({ ...errors, [technician.userId]: '' }));
    try {
      const { technician: updated } = await api<{ technician: AdminTechnician }>(
        `/admin/technicians/${technician.userId}/approval`,
        { method: 'PATCH', body },
      );
      setList(
        (current) =>
          current && {
            technicians: current.technicians.filter((t) => t.userId !== technician.userId),
            counts: {
              ...current.counts,
              [tab]: current.counts[tab] - 1,
              [updated.approvalStatus]: current.counts[updated.approvalStatus] + 1,
            },
          },
      );
      setRejectingId('');
      setViewing(null);
      setDone(message);
    } catch (error) {
      setCardErrors((errors) => ({
        ...errors,
        [technician.userId]: formErrorsFrom(error).message || 'Please check the reason.',
      }));
    } finally {
      setBusyId('');
    }
  }

  const approve = (t: AdminTechnician) =>
    review(t, { status: 'approved' }, `${t.user.name} is approved. Customers can now book them.`);
  const reject = (t: AdminTechnician, reason: string) =>
    review(
      t,
      { status: 'rejected', reason },
      `${t.user.name} is rejected. They'll see your reason.`,
    );

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-4xl font-extrabold">Technicians</h1>
        <p className="text-muted">
          Check new technicians before customers can see them. Oldest first.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Technicians by status"
        className="flex gap-1.5 overflow-x-auto border-b border-line"
      >
        {tabs.map(({ value, label }) => {
          const on = value === tab;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => openTab(value)}
              className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-[3px] px-3.5 py-2.5 font-bold ${
                on ? 'border-turmeric text-tea' : 'border-transparent text-muted hover:text-tea'
              }`}
            >
              {label}
              {list && (
                <span
                  className={`rounded-full border px-2 text-[13px] ${
                    on ? 'border-turmeric bg-turmeric' : 'border-line bg-paper'
                  }`}
                >
                  {list.counts[value]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {done && (
        <p
          role="status"
          className="flex items-center gap-2.5 rounded-box border border-[#bfdcd3] bg-pond-soft px-3.5 py-2.5 font-semibold"
        >
          <Check size={18} className="text-pond" aria-hidden="true" />
          {done}
        </p>
      )}

      {loadError && (
        <div className="grid max-w-md gap-3">
          <Alert>{loadError}</Alert>
          <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </Button>
        </div>
      )}

      {!list && !loadError && (
        <div className="grid place-items-center py-16 text-muted">
          <LoaderCircle className="animate-spin" aria-label="Loading technicians" />
        </div>
      )}

      {list && list.technicians.length === 0 && (
        <p className="rounded-box border border-dashed border-line bg-white px-4 py-8 text-center text-muted">
          {tabs.find((t) => t.value === tab)!.empty}
        </p>
      )}

      {list?.technicians.map((technician) => (
        <TechnicianReviewCard
          key={technician.userId}
          technician={technician}
          services={services}
          busy={busyId === technician.userId}
          error={cardErrors[technician.userId]}
          rejecting={rejectingId === technician.userId}
          onStartReject={() => setRejectingId(technician.userId)}
          onCancelReject={() => setRejectingId('')}
          onApprove={() => approve(technician)}
          onReject={(reason) => reject(technician, reason)}
          onViewNid={() => setViewing(technician)}
        />
      ))}

      {viewing && (
        <NidPhotoDialog
          technician={viewing}
          serviceNames={serviceNames(viewing.serviceIds, services)}
          onClose={() => setViewing(null)}
          onApprove={() => approve(viewing)}
          onReject={() => {
            setRejectingId(viewing.userId);
            setViewing(null);
          }}
        />
      )}
    </div>
  );
}
