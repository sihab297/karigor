// the week starts on Saturday in Bangladesh
export const WEEK = [
  { value: 6, short: 'Sat', name: 'Saturday' },
  { value: 0, short: 'Sun', name: 'Sunday' },
  { value: 1, short: 'Mon', name: 'Monday' },
  { value: 2, short: 'Tue', name: 'Tuesday' },
  { value: 3, short: 'Wed', name: 'Wednesday' },
  { value: 4, short: 'Thu', name: 'Thursday' },
  { value: 5, short: 'Fri', name: 'Friday' },
];

// "Sat to Thu" when the days run on, otherwise "Sat, Mon, Wed"
export function describeDays(days: number[]) {
  const positions = WEEK.map((day, i) => (days.includes(day.value) ? i : -1)).filter((i) => i >= 0);
  if (positions.length === 0) return 'No days chosen';
  if (positions.length === 7) return 'Every day';
  const together = positions.every((p, i) => i === 0 || p === positions[i - 1]! + 1);
  if (together && positions.length > 2) {
    return `${WEEK[positions[0]!]!.short} to ${WEEK[positions.at(-1)!]!.short}`;
  }
  return positions.map((p) => WEEK[p]!.short).join(', ');
}
