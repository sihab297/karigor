import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

export function Alert({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex gap-2.5 rounded-box border-l-4 border-alert bg-alert-soft px-3.5 py-3 text-sm text-alert-ink"
    >
      <CircleAlert size={18} className="mt-0.5 shrink-0 text-alert" aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}
