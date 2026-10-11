import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
      <Link to="/" className="text-blue-700 underline">
        Go to the home page
      </Link>
    </main>
  );
}
