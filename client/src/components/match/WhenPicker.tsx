import { useState, type Ref } from 'react';
import {
  dayLabel,
  HOUR_GROUPS,
  hourLabel,
  isDayOver,
  isTooSoon,
  nextDays,
  type Slot,
} from '../../lib/dhaka-time';

interface WhenPickerProps {
  value: Slot | null;
  onChange: (slot: Slot | null) => void;
  now: Date;
  error?: string;
  ref?: Ref<HTMLDivElement>;
}

const chipClass = (on: boolean) =>
  `rounded-box border-[1.5px] transition-colors disabled:cursor-not-allowed disabled:line-through disabled:opacity-40 ${
    on ? 'border-tea bg-turmeric-soft' : 'border-line bg-white enabled:hover:border-muted'
  }`;

export function WhenPicker({ value, onChange, now, error, ref }: WhenPickerProps) {
  const [date, setDate] = useState<string | null>(value?.date ?? null);
  const days = nextDays(now);

  function chooseDay(next: string) {
    setDate(next);
    const hour = value?.hour;
    onChange(
      hour !== undefined && !isTooSoon({ date: next, hour }, now) ? { date: next, hour } : null,
    );
  }

  return (
    <div ref={ref} className="grid gap-2.5">
      <span className="font-semibold">When?</span>
      <div role="group" aria-label="Day" className="flex gap-1.5 overflow-x-auto pb-1">
        {days.map((day) => {
          const label = dayLabel(day, now);
          return (
            <button
              key={day}
              type="button"
              aria-pressed={day === date}
              aria-label={`${label.top}, ${label.bottom}`}
              disabled={isDayOver(day, now)}
              onClick={() => chooseDay(day)}
              className={`min-w-16 shrink-0 px-2.5 py-1.5 text-center leading-tight ${chipClass(day === date)}`}
            >
              <b className="block text-[15px]">{label.top}</b>
              <span className="text-[13px] text-muted">{label.bottom}</span>
            </button>
          );
        })}
      </div>

      {date ? (
        <div className="grid gap-2.5">
          {HOUR_GROUPS.map((group) => (
            <div key={group.name} role="group" aria-label={group.name}>
              <p className="mb-1 text-sm font-semibold text-muted">{group.name}</p>
              <div className="flex flex-wrap gap-2">
                {group.hours.map((hour) => {
                  const on = value?.date === date && value.hour === hour;
                  return (
                    <button
                      key={hour}
                      type="button"
                      aria-pressed={on}
                      disabled={isTooSoon({ date, hour }, now)}
                      onClick={() => onChange({ date, hour })}
                      className={`h-10 min-w-19 px-2.5 text-[15px] font-semibold ${chipClass(on)}`}
                    >
                      {hourLabel(hour)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">Pick a day to see the times.</p>
      )}
      {error && <p className="text-sm font-medium text-alert">{error}</p>}
    </div>
  );
}
