import { Link } from 'react-router';
import { Logo } from '../components/Logo';

export default function NotFoundPage() {
  return (
    <main className="min-h-dvh px-4 py-8">
      <div className="mx-auto grid max-w-md gap-6">
        <Logo />
        <h1 className="text-3xl font-extrabold">Page not found</h1>
        <p className="text-muted">
          This link doesn't go anywhere. It may have changed or been typed wrong.
        </p>
        <Link to="/" className="font-semibold text-pond underline underline-offset-2">
          Go to the home page
        </Link>
      </div>
    </main>
  );
}
