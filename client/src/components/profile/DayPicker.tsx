import { WEEK } from '../../lib/days';

interface DayPickerProps {
  selected: number[];
  onToggle: (day: number) => void;
}

export function DayPicker({ selected, onToggle }: DayPickerProps) {
  return (
    <div role="group" aria-label="Working days" className="grid grid-cols-7 gap-1.5">
      {WEEK.map((day) => {
        const on = selected.includes(day.value);
        return (
          <button
            key={day.value}
            type="button"
            aria-pressed={on}
            aria-label={day.name}
            onClick={() => onToggle(day.value)}
            className={`h-12 rounded-box border-[1.5px] text-[15px] font-semibold transition-colors ${
              on ? 'border-tea bg-turmeric' : 'border-line bg-white hover:border-muted'
            }`}
          >
            {day.short}
          </button>
        );
      })}
    </div>
  );
}
