import { LoaderCircle } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  loading?: boolean;
}

const styles = {
  primary: 'bg-turmeric text-tea hover:bg-turmeric-dark',
  secondary: 'border-[1.5px] border-tea bg-white text-tea hover:bg-paper',
};

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  children,
  ...button
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-box px-5 text-base font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${styles[variant]} ${className}`}
      {...button}
    >
      {loading && <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
