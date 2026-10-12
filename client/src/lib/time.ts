export function formatTime(value: string) {
  const [hours = 0, minutes = 0] = value.split(':').map(Number);
  const suffix = hours < 12 ? 'AM' : 'PM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

// every 30 minutes from 6:00 AM to 11:30 PM
export const timeOptions = Array.from({ length: 36 }, (_, i) => {
  const hours = 6 + Math.floor(i / 2);
  const minutes = i % 2 === 0 ? '00' : '30';
  return `${String(hours).padStart(2, '0')}:${minutes}`;
});
