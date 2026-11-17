import { LoaderCircle } from 'lucide-react';
import { useCallback, useEffect, useId, useState } from 'react';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { PricesPanel } from '../../components/admin/catalog/PricesPanel';
import { SafetyPanel } from '../../components/admin/catalog/SafetyPanel';
import { SkillsPanel } from '../../components/admin/catalog/SkillsPanel';
import { api } from '../../lib/api';
import { formErrorsFrom } from '../../lib/form-errors';
import { useDocumentTitle } from '../../lib/use-document-title';
import type { AdminCatalog } from './admin-types';

type Tab = 'skills' | 'prices' | 'safety';
const TABS: { id: Tab; label: string }[] = [
  { id: 'skills', label: 'Skills' },
  { id: 'prices', label: 'Prices' },
  { id: 'safety', label: 'Safety tips' },
];

export default function AdminCatalogPage() {
  useDocumentTitle('Services and prices');
  const serviceSelectId = useId();
  const [catalog, setCatalog] = useState<AdminCatalog | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('prices');
  const [serviceId, setServiceId] = useState('');

  const [attempt, setAttempt] = useState(0);

  const show = useCallback((data: AdminCatalog) => {
    setCatalog(data);
    setServiceId((current) => current || data.services[0]?.id || '');
  }, []);

  // first load, and again after "Try again"
  useEffect(() => {
    let stillHere = true;
    api<AdminCatalog>('/admin/catalog')
      .then((data) => stillHere && show(data))
      .catch((err: unknown) => {
        if (stillHere) setError(formErrorsFrom(err).message || "Couldn't load the catalog.");
      });
    return () => {
      stillHere = false;
    };
  }, [attempt, show]);

  // after each change, so the page always shows what is saved
  const load = useCallback(async () => {
    show(await api<AdminCatalog>('/admin/catalog'));
  }, [show]);

  const service = catalog?.services.find((s) => s.id === serviceId);
  const tabClass = (on: boolean) =>
    `h-10 flex-1 rounded-lg font-semibold ${on ? 'bg-white text-tea shadow-sm' : 'text-muted hover:text-tea'}`;

  return (
    <div className="mx-auto grid max-w-4xl gap-5">
      <h1 className="text-3xl font-extrabold">Services and prices</h1>

      {error ? (
        <div className="grid max-w-md gap-4">
          <Alert>{error}</Alert>
          <Button
            variant="secondary"
            onClick={() => {
              setError('');
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </Button>
        </div>
      ) : !catalog ? (
        <div className="grid place-items-center py-16 text-muted">
          <LoaderCircle className="animate-spin" aria-label="Loading the catalog" />
        </div>
      ) : (
        <>
          <div
            role="tablist"
            aria-label="Catalog"
            className="flex gap-1 rounded-box bg-[#ece8df] p-1"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={tabClass(tab === t.id)}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab !== 'safety' && (
            <div className="grid gap-1.5">
              <label htmlFor={serviceSelectId} className="font-semibold">
                Service
              </label>
              <select
                id={serviceSelectId}
                value={serviceId}
                onChange={(event) => setServiceId(event.target.value)}
                className="h-12 rounded-box border-[1.5px] border-line bg-white px-3 text-base focus:border-tea focus:outline-none sm:max-w-xs"
              >
                {catalog.services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.active ? '' : ' (off)'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {tab === 'skills' && service && (
            <SkillsPanel key={service.id} service={service} onChanged={load} />
          )}
          {tab === 'prices' && service && (
            <PricesPanel
              key={service.id}
              service={service}
              items={catalog.priceItems.filter((item) => item.serviceId === service.id)}
              onChanged={load}
            />
          )}
          {tab === 'safety' && <SafetyPanel tips={catalog.safetyTips} onChanged={load} />}

          <p className="text-sm text-muted">
            Changes are used straight away: by the problem check, the prices customers see and the
            quick path.
          </p>
        </>
      )}
    </div>
  );
}
