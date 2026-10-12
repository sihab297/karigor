import { Check, Eye } from 'lucide-react';
import { useState } from 'react';
import { serviceNames, skillNames } from '../../lib/catalog';
import { describeDays } from '../../lib/days';
import { timeAgo } from '../../lib/relative-time';
import { formatTime } from '../../lib/time';
import type { AdminTechnician } from '../../pages/admin/admin-types';
import type { Service } from '../../pages/technician/profile-types';
import { Alert } from '../Alert';
import { Button } from '../Button';

const quickReasons = {
  noPhoto: ['NID photo is missing'],
  always: ['NID photo is blurry', "Name doesn't match the NID", "Skills don't match the services"],
};

interface TechnicianReviewCardProps {
  technician: AdminTechnician;
  services: Service[];
  busy: boolean;
  error?: string;
  rejecting: boolean;
  onStartReject: () => void;
  onCancelReject: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onViewNid: () => void;
}

export function TechnicianReviewCard({
  technician,
  services,
  busy,
  error,
  rejecting,
  onStartReject,
  onCancelReject,
  onApprove,
  onReject,
  onViewNid,
}: TechnicianReviewCardProps) {
  const [reason, setReason] = useState('');
  const [reasonProblem, setReasonProblem] = useState('');
  const { user } = technician;
  const firstName = user.name.split(' ')[0];
  const serviceList = serviceNames(technician.serviceIds, services);
  const skillList = skillNames(technician.skillIds, services);
  const reasons = [...(technician.hasNidPhoto ? [] : quickReasons.noPhoto), ...quickReasons.always];
  const status = technician.approvalStatus;

  function confirmReject() {
    if (reason.trim().length < 5) {
      setReasonProblem('Tell the technician why, in a few words.');
      return;
    }
    setReasonProblem('');
    onReject(reason.trim());
  }

  return (
    <article
      aria-label={user.name}
      className="grid gap-3.5 rounded-box border border-line bg-white p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="grid size-11 shrink-0 place-items-center rounded-full bg-turmeric-soft text-lg font-bold"
            aria-hidden="true"
          >
            {user.name.charAt(0)}
          </span>
          <div>
            <h2 className="text-xl font-bold">{user.name}</h2>
            <p className="text-[15px] text-muted">
              {user.phone} · {serviceList} · {technician.areaName}
            </p>
          </div>
        </div>
        <span className="text-sm text-muted">
          {status === 'pending'
            ? `Sent ${timeAgo(technician.updatedAt)}`
            : `${status === 'approved' ? 'Approved' : 'Rejected'} ${timeAgo(technician.reviewedAt ?? technician.updatedAt)}`}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[15px] sm:grid-cols-4">
        <div>
          <dt className="text-[13px] text-muted">Services</dt>
          <dd className="font-semibold">{serviceList}</dd>
        </div>
        <div>
          <dt className="text-[13px] text-muted">Experience</dt>
          <dd className="font-semibold">
            {technician.experienceYears} {technician.experienceYears === 1 ? 'year' : 'years'}
          </dd>
        </div>
        <div>
          <dt className="text-[13px] text-muted">Works</dt>
          <dd className="font-semibold">
            {describeDays(technician.workingDays)}, {formatTime(technician.workingHours.start)} to{' '}
            {formatTime(technician.workingHours.end)}
          </dd>
        </div>
        <div>
          <dt className="text-[13px] text-muted">Travels</dt>
          <dd className="font-semibold">Up to {technician.serviceRadiusKm} km</dd>
        </div>
      </dl>

      <ul className="flex flex-wrap gap-1.5" aria-label="Skills">
        {skillList.map((name) => (
          <li
            key={name}
            className="rounded-box border border-line bg-paper px-2.5 py-0.5 text-sm font-semibold"
          >
            {name}
          </li>
        ))}
      </ul>

      {status === 'rejected' && technician.rejectionReason && (
        <p className="rounded-box bg-alert-soft px-3 py-2.5 text-alert-ink">
          <strong>Reason sent:</strong> {technician.rejectionReason}
        </p>
      )}

      {technician.hasNidPhoto ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-box bg-paper p-3">
          <div>
            <strong className="block">NID photo uploaded</strong>
            <span className="text-sm text-muted">Check that the name and face match.</span>
          </div>
          <Button variant="secondary" onClick={onViewNid}>
            <Eye size={18} aria-hidden="true" />
            View NID photo
          </Button>
        </div>
      ) : (
        <div className="rounded-box bg-turmeric-soft p-3">
          <strong className="block">No NID photo yet</strong>
          <span className="text-sm text-muted">
            You can approve only after the technician uploads it.
          </span>
        </div>
      )}

      {error && <Alert>{error}</Alert>}

      {!rejecting && (
        <div className="flex flex-wrap justify-end gap-2.5">
          {status !== 'rejected' && (
            <Button variant="secondary" onClick={onStartReject} disabled={busy}>
              Reject
            </Button>
          )}
          {status !== 'approved' && (
            <Button
              onClick={onApprove}
              loading={busy}
              disabled={!technician.hasNidPhoto}
              title={technician.hasNidPhoto ? undefined : 'Needs an NID photo first'}
            >
              <Check size={18} aria-hidden="true" />
              Approve
            </Button>
          )}
        </div>
      )}

      {rejecting && (
        <div className="grid gap-2.5 border-t border-line pt-3.5">
          <label htmlFor={`reason-${technician.userId}`} className="font-bold">
            Why are you rejecting? The technician will see this.
          </label>
          <div className="flex flex-wrap gap-1.5">
            {reasons.map((quick) => (
              <button
                key={quick}
                type="button"
                onClick={() => setReason(`${quick}. Please fix it and save your profile again.`)}
                className={`rounded-box border-[1.5px] px-2.5 py-1.5 text-sm font-semibold ${
                  reason.startsWith(quick) ? 'border-tea bg-turmeric-soft' : 'border-line bg-white'
                }`}
              >
                {quick}
              </button>
            ))}
          </div>
          <textarea
            id={`reason-${technician.userId}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Write a short reason"
            rows={3}
            className="w-full rounded-box border-[1.5px] border-line px-3 py-2.5 focus:border-tea focus:outline-none"
          />
          {reasonProblem && <p className="text-sm font-medium text-alert">{reasonProblem}</p>}
          <div className="flex flex-wrap justify-end gap-2.5">
            <Button variant="secondary" onClick={onCancelReject} disabled={busy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmReject} loading={busy}>
              Reject {firstName}
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}
