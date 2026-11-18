import { LoaderCircle, WifiOff } from 'lucide-react';
import { Button } from '../components/Button';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './auth-context';
import { homePathFor, type Role } from './types';

export function RequireRole({ role }: { role: Role }) {
  const { user, checking, checkError, retryCheck } = useAuth();
  const location = useLocation();

  if (checking) {
    return (
      <main className="grid min-h-dvh place-items-center text-muted">
        <LoaderCircle className="animate-spin" aria-label="Loading" />
      </main>
    );
  }
  // the login is kept; we just couldn't check it, so offer to try again instead of logging out
  if (checkError) {
    return (
      <main className="grid min-h-dvh place-items-center px-4">
        <div className="grid max-w-sm justify-items-center gap-4 text-center">
          <WifiOff size={36} className="text-muted" aria-hidden="true" />
          <h1 className="text-2xl font-extrabold">Can't open Karigor right now</h1>
          <p className="text-muted">{checkError}</p>
          <Button onClick={retryCheck}>Try again</Button>
        </div>
      </main>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== role) return <Navigate to={homePathFor(user.role)} replace />;

  return <Outlet />;
}
