import { STATUS_TAGS, type BookingStatus } from '../../lib/bookings';

export function StatusTag({ status }: { status: BookingStatus }) {
  const tag = STATUS_TAGS[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-sm font-bold ${tag.className}`}
    >
      {tag.label}
    </span>
  );
}
