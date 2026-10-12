interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2.5 font-semibold disabled:opacity-60"
    >
      {label}
      <span
        className={`relative h-7 w-12 rounded-full transition-colors ${checked ? 'bg-pond' : 'bg-line'}`}
        aria-hidden="true"
      >
        <span
          className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${
            checked ? 'left-6' : 'left-1'
          }`}
        />
      </span>
    </button>
  );
}
