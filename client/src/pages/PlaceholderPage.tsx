import { LoaderCircle } from 'lucide-react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../auth/auth-context';
import { homePathFor, type Role } from '../auth/types';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';

// stands in for pages that come in later issues (#6, #9, #14, #28)
export default function PlaceholderPage({ role, title }: { role: Role; title: string }) {
  const { user, checking, logout } = useAuth();
  const location = useLocation();

  if (checking) {
    return (
      <main className="grid min-h-dvh place-items-center text-muted">
        <LoaderCircle className="animate-spin" aria-label="Loading" />
      </main>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== role) return <Navigate to={homePathFor(user.role)} replace />;

  return (
    <main className="min-h-dvh px-4 py-8">
      <div className="mx-auto grid max-w-md gap-7">
        <Logo />
        <div className="grid gap-4 rounded-box border border-line bg-white p-6">
          <h1 className="text-3xl font-extrabold">Hi, {user.name.split(' ')[0]}</h1>
          <p className="text-muted">
            You're logged in. The <strong className="text-tea">{title}</strong> page is coming next.
          </p>
          <Button variant="secondary" onClick={logout}>
            Log out
          </Button>
        </div>
      </div>
    </main>
  );
}
