const DAY = 24 * 60 * 60 * 1000;

export function timeAgo(date: string | Date, now = new Date()) {
  const then = new Date(date);
  const days = Math.floor((now.getTime() - then.getTime()) / DAY);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return `on ${then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}
