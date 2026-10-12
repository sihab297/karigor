import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

interface StepCardProps {
  step: number;
  title: string;
  description: string;
  done: boolean;
  error?: string;
  children: ReactNode;
}

export function StepCard({ step, title, description, done, error, children }: StepCardProps) {
  return (
    <section
      aria-labelledby={`step-${step}`}
      className={`grid gap-4 rounded-box border bg-white p-5 ${error ? 'border-alert' : 'border-line'}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid size-8 shrink-0 place-items-center rounded-full font-bold text-white ${
            done ? 'bg-pond' : 'bg-tea'
          }`}
          aria-label={done ? 'Done' : undefined}
        >
          {done ? <Check size={18} aria-hidden="true" /> : step}
        </span>
        <div>
          <h2 id={`step-${step}`} className="text-2xl font-bold">
            {title}
          </h2>
          <p className="text-muted">{description}</p>
        </div>
      </div>
      {children}
      {error && <p className="text-sm font-medium text-alert">{error}</p>}
    </section>
  );
}
