export type BookingStatus =
  'requested' | 'accepted' | 'rejected' | 'cancelled' | 'on_the_way' | 'arrived' | 'completed';

export interface Booking {
  id: string;
  problemId: string;
  status: BookingStatus;
  serviceId: string;
  serviceName: string;
  scheduledAt: string;
  emergency: boolean;
  location: { lat: number; lng: number };
  // null for the technician until they accept
  addressText: string | null;
  note: string;
  estimate: { min: number; max: number } | null;
  finalPrice: number | null;
  cancelReason: string | null;
  createdAt: string;
  problem: { text: string; summary: string | null; urgency: string | null } | null;
  technician: {
    id: string;
    name: string;
    phone: string | null;
    rating: number | null;
    ratingCount: number;
  };
  customer: { id: string; name: string; phone: string | null };
  statusHistory: { status: BookingStatus; at: string; by: 'customer' | 'technician' }[];
  // what the person looking can do next
  actions: BookingStatus[];
  review: BookingReview | null;
  // the customer can still review this finished job
  canReview: boolean;
}

export interface BookingReview {
  rating: number;
  comment: string;
  at: string;
}

export const RATING_WORDS = ['', 'Poor', 'Not good', 'OK', 'Good', 'Excellent'];

export const OPEN_STATUSES: BookingStatus[] = ['requested', 'accepted', 'on_the_way', 'arrived'];

// words and colours for the status tag (red only for problems)
export const STATUS_TAGS: Record<BookingStatus, { label: string; className: string }> = {
  requested: { label: 'Waiting for reply', className: 'bg-turmeric-soft text-tea' },
  accepted: { label: 'Accepted', className: 'bg-pond-soft text-pond' },
  on_the_way: { label: 'On the way', className: 'bg-pond-soft text-pond' },
  arrived: { label: 'Arrived', className: 'bg-pond-soft text-pond' },
  completed: { label: 'Completed', className: 'bg-pond text-white' },
  rejected: { label: 'Not accepted', className: 'bg-alert-soft text-alert-ink' },
  cancelled: { label: 'Cancelled', className: 'bg-paper text-muted' },
};

// the steps a job goes through, for the timeline
export const JOB_STEPS: { status: BookingStatus; label: string }[] = [
  { status: 'requested', label: 'Request sent' },
  { status: 'accepted', label: 'Accepted' },
  { status: 'on_the_way', label: 'On the way' },
  { status: 'arrived', label: 'Arrived' },
  { status: 'completed', label: 'Work done' },
];

// "Sun 18 Oct, 10:00 AM" in Dhaka time
export function dhakaDateTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
    .format(new Date(value))
    .replace(/\b(am|pm)\b/, (m) => m.toUpperCase());
}
