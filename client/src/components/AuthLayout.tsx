import type { ReactNode } from 'react';
import { Logo } from './Logo';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <main className="min-h-dvh px-4 py-8 sm:py-14">
      <div className="mx-auto grid w-full max-w-md gap-7">
        <Logo />
        <div className="grid gap-6 rounded-box border border-line bg-white p-5 sm:p-7">
          <div className="grid gap-1">
            <h1 className="text-3xl font-extrabold leading-tight">{title}</h1>
            <p className="text-muted">{subtitle}</p>
          </div>
          {children}
        </div>
        <p className="text-center">{footer}</p>
      </div>
    </main>
  );
}
