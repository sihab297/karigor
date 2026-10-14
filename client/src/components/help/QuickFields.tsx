import { Check, LoaderCircle } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { api } from '../../lib/api';
import type { QuickPick } from '../../pages/customer/problem-types';
import type { Service } from '../../pages/technician/profile-types';
import { ServiceGrid } from './ServiceGrid';

interface QuickFieldsProps {
  services: Service[];
  serviceId: string;
  onServiceChange: (serviceId: string) => void;
  line: string;
  onLineChange: (line: string) => void;
  errors: { service?: string; line?: string };
}

export function QuickFields({
  services,
  serviceId,
  onServiceChange,
  line,
  onLineChange,
  errors,
}: QuickFieldsProps) {
  const labelId = useId();
  const lineId = useId();
  // null means the list didn't load; the customer can still write their own line
  const [picks, setPicks] = useState<Record<string, QuickPick[] | null>>({});

  useEffect(() => {
    if (!serviceId || serviceId in picks) return;
    let stillHere = true;
    api<{ quickPicks: QuickPick[] }>(`/services/${serviceId}/quick-picks`)
      .then((data) => data.quickPicks)
      .catch(() => null)
      .then((list) => {
        if (stillHere) setPicks((all) => ({ ...all, [serviceId]: list }));
      });
    return () => {
      stillHere = false;
    };
  }, [serviceId, picks]);

  const list = serviceId ? picks[serviceId] : undefined;

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <span id={labelId} className="font-semibold">
          Which service?
        </span>
        <ServiceGrid
          services={services}
          value={serviceId}
          onChange={onServiceChange}
          labelledBy={labelId}
        />
        {errors.service && <p className="text-sm font-medium text-alert">{errors.service}</p>}
      </div>

      {serviceId && (
        <div className="grid gap-2">
          <label htmlFor={lineId} className="font-semibold">
            What needs doing?
          </label>
          {list === undefined ? (
            <p className="flex items-center gap-2 text-sm text-muted">
              <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
              Loading common jobs…
            </p>
          ) : list && list.length > 0 ? (
            <>
              <p className="text-sm text-muted">Tap one, or write your own in one line.</p>
              <div className="flex flex-wrap gap-2">
                {list.map((pick) => {
                  const on = pick.label === line.trim();
                  return (
                    <button
                      key={pick.priceItemId}
                      type="button"
                      aria-pressed={on}
                      onClick={() => onLineChange(pick.label)}
                      className={`inline-flex min-h-10 items-center gap-1.5 rounded-box border-[1.5px] px-3 py-1.5 text-[15px] font-semibold transition-colors ${
                        on
                          ? 'border-tea bg-turmeric-soft'
                          : 'border-line bg-white hover:border-muted'
                      }`}
                    >
                      {on && <Check size={15} aria-hidden="true" />}
                      {pick.label}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">Write it in one line, in your own words.</p>
          )}
          <input
            id={lineId}
            type="text"
            value={line}
            maxLength={500}
            onChange={(event) => onLineChange(event.target.value)}
            placeholder="Or write it in your own words"
            aria-invalid={errors.line ? true : undefined}
            aria-describedby={errors.line ? `${lineId}-error` : undefined}
            className={`h-12 w-full rounded-box border-[1.5px] bg-white px-3.5 text-base text-tea placeholder:text-muted/70 focus:border-tea focus:outline-none ${
              errors.line ? 'border-alert' : 'border-line'
            }`}
          />
          {errors.line && (
            <p id={`${lineId}-error`} className="text-sm font-medium text-alert">
              {errors.line}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
