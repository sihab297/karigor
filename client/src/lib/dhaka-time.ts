// customers pick times in Dhaka time, even if their phone is set to another time zone
const ZONE = 'Asia/Dhaka';
const OFFSET = '+06:00';
// a karigor needs a little time to get there
const SOON_MS = 30 * 60 * 1000;

export const HOUR_GROUPS = [
  { name: 'Morning', hours: [9, 10, 11] },
  { name: 'Afternoon', hours: [12, 13, 14, 15, 16] },
  { name: 'Evening', hours: [17, 18, 19] },
];
const ALL_HOURS = HOUR_GROUPS.flatMap((group) => group.hours);

export interface Slot {
  date: string;
  hour: number;
}

// YYYY-MM-DD in Dhaka
export function dhakaDate(at: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONE }).format(at);
}

const noonOf = (date: string) => new Date(`${date}T12:00:00${OFFSET}`);

export function nextDays(now: Date, count = 7) {
  const today = noonOf(dhakaDate(now));
  return Array.from({ length: count }, (_, i) =>
    dhakaDate(new Date(today.getTime() + i * 24 * 60 * 60 * 1000)),
  );
}

export function slotIso({ date, hour }: Slot) {
  return `${date}T${String(hour).padStart(2, '0')}:00:00${OFFSET}`;
}

export function isTooSoon(slot: Slot, now: Date) {
  return new Date(slotIso(slot)).getTime() < now.getTime() + SOON_MS;
}

export function isDayOver(date: string, now: Date) {
  return ALL_HOURS.every((hour) => isTooSoon({ date, hour }, now));
}

function relativeDay(date: string, now: Date) {
  const [today, tomorrow] = nextDays(now, 2);
  if (date === today) return 'Today';
  if (date === tomorrow) return 'Tomorrow';
  return null;
}

export function dayLabel(date: string, now: Date) {
  const noon = noonOf(date);
  return {
    top:
      relativeDay(date, now) ??
      noon.toLocaleDateString('en-GB', { weekday: 'short', timeZone: ZONE }),
    bottom: noon.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: ZONE }),
  };
}

export function hourLabel(hour: number) {
  return `${hour % 12 || 12}:00 ${hour < 12 ? 'AM' : 'PM'}`;
}

// e.g. "Tomorrow, 15 Oct at 10:00 AM"
export function whenLabel(iso: string, now: Date) {
  const at = new Date(iso);
  const date = dhakaDate(at);
  const day =
    relativeDay(date, now) ??
    noonOf(date).toLocaleDateString('en-GB', { weekday: 'long', timeZone: ZONE });
  const dayMonth = noonOf(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: ZONE,
  });
  const time = at.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: ZONE,
  });
  return `${day}, ${dayMonth} at ${time}`;
}
