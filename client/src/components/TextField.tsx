import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  addon?: ReactNode;
}

export function TextField({ label, hint, error, addon, className = '', ...input }: TextFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined
          }
          className={`h-12 w-full rounded-box border-[1.5px] bg-white px-3.5 text-base text-tea placeholder:text-muted/70 focus:border-tea focus:outline-none ${
            error ? 'border-alert' : 'border-line'
          } ${addon ? 'pr-12' : ''} ${className}`}
          {...input}
        />
        {addon && <div className="absolute inset-y-0 right-1 flex items-center">{addon}</div>}
      </div>
      {hint && !error && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm font-medium text-alert">
          {error}
        </p>
      )}
    </div>
  );
}
