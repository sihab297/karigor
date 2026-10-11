import { useEffect, useState } from 'react';
import { apiGet } from '../lib/api';

type ApiStatus = 'checking' | 'connected' | 'offline';

export default function HomePage() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking');

  useEffect(() => {
    apiGet<{ status: string }>('/health')
      .then((health) => setApiStatus(health.status === 'ok' ? 'connected' : 'offline'))
      .catch(() => setApiStatus('offline'));
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-4">
      <h1 className="text-4xl font-bold text-slate-900">Karigor</h1>
      <p className="text-lg text-slate-600">
        Tell us the problem, and we will find the right karigor for you.
      </p>
      <p className="text-sm text-slate-500">
        {apiStatus === 'checking' && 'Checking API...'}
        {apiStatus === 'connected' && 'API connected'}
        {apiStatus === 'offline' && 'API offline. Start the server with npm run dev.'}
      </p>
    </main>
  );
}
