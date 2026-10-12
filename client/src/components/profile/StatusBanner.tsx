import type { TechnicianProfile } from '../../pages/technician/profile-types';
import { Switch } from '../Switch';

interface StatusBannerProps {
  profile: TechnicianProfile | null;
  onToggleJobs: (acceptingJobs: boolean) => void;
  toggling: boolean;
}

export function StatusBanner({ profile, onToggleJobs, toggling }: StatusBannerProps) {
  if (!profile) {
    return (
      <div className="rounded-box border border-dashed border-line bg-white px-4 py-3.5">
        <strong>Fill in your profile</strong> so customers can find you. The admin checks every new
        karigor before they appear.
      </div>
    );
  }

  if (profile.approvalStatus === 'rejected') {
    return (
      <div
        role="alert"
        className="rounded-box border border-[#f4c7c2] bg-alert-soft px-4 py-3.5 text-alert-ink"
      >
        <strong>Not approved:</strong> "{profile.rejectionReason ?? 'Some details need fixing.'}"
        Fix it below and save to send it again.
      </div>
    );
  }

  if (profile.approvalStatus === 'pending') {
    return (
      <div className="flex gap-3 rounded-box border border-[#f1d9a3] bg-turmeric-soft px-4 py-3.5">
        <span className="mt-2 size-2.5 shrink-0 rounded-full bg-turmeric" aria-hidden="true" />
        <div>
          <strong className="block">Waiting for approval</strong>
          <p className="text-muted">
            {profile.hasNidPhoto
              ? "The Karigor admin is checking your details and NID photo. You'll start getting jobs once you're approved."
              : 'Add your NID photo below so the admin can check and approve you.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-box border border-[#bfdcd3] bg-pond-soft px-4 py-3.5">
      <p>
        <strong>Approved.</strong>{' '}
        {profile.acceptingJobs
          ? 'Customers can find and book you.'
          : "You're not taking jobs right now, so customers won't see you."}
      </p>
      <Switch
        label="Taking jobs"
        checked={profile.acceptingJobs}
        onChange={onToggleJobs}
        disabled={toggling}
      />
    </div>
  );
}
