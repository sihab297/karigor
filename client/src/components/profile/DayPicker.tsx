// the week starts on Saturday in Bangladesh
const days = [
  { value: 6, short: 'Sat', name: 'Saturday' },
  { value: 0, short: 'Sun', name: 'Sunday' },
  { value: 1, short: 'Mon', name: 'Monday' },
  { value: 2, short: 'Tue', name: 'Tuesday' },
  { value: 3, short: 'Wed', name: 'Wednesday' },
  { value: 4, short: 'Thu', name: 'Thursday' },
  { value: 5, short: 'Fri', name: 'Friday' },
];

interface DayPickerProps {
  selected: number[];
  onToggle: (day: number) => void;
}

export function DayPicker({ selected, onToggle }: DayPickerProps) {
  return (
    <div role="group" aria-label="Working days" className="grid grid-cols-7 gap-1.5">
      {days.map((day) => {
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
