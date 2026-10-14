// Bangladesh is UTC+6 all year (no daylight saving)
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

// working days and hours are saved in Dhaka time, e.g. Saturday 09:00
export function dhakaClock(date: Date) {
  const local = new Date(date.getTime() + DHAKA_OFFSET_MS);
  const hours = String(local.getUTCHours()).padStart(2, '0');
  const minutes = String(local.getUTCMinutes()).padStart(2, '0');
  return { day: local.getUTCDay(), time: `${hours}:${minutes}` };
}
