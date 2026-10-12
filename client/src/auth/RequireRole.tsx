import { LoaderCircle } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './auth-context';
import { homePathFor, type Role } from './types';

export function RequireRole({ role }: { role: Role }) {
  const { user, checking } = useAuth();
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

  return <Outlet />;
}
