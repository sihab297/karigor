import { Info } from 'lucide-react';
import { takaRange } from '../../lib/money';
import type { PriceLine } from '../../pages/customer/problem-types';

interface PriceCardProps {
  estimate: { min: number; max: number } | null;
  lines: PriceLine[];
}

const cardClass = 'grid gap-3.5 rounded-box border border-line bg-white p-4 sm:p-5';

export function PriceCard({ estimate, lines }: PriceCardProps) {
  if (!estimate) {
    return (
      <section className={cardClass}>
        <p className="text-[17px] font-semibold">The karigor tells you the price after checking.</p>
        <p className="flex items-start gap-2 text-sm text-muted">
          <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          Agree on the price before the work starts. Parts are extra.
        </p>
      </section>
    );
  }

  return (
    <section className={cardClass}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-body text-base font-semibold text-muted">Rough price</h2>
        <p className="font-heading text-[34px] leading-none font-extrabold">
          {takaRange(estimate.min, estimate.max)}
        </p>
      </div>
      <ul className="grid gap-1.5 text-[15px]">
        {lines.map((line) => (
          <li key={line.priceItemId} className="flex justify-between gap-3">
            <span>
              {line.name}
              {line.quantity > 1 && ` × ${line.quantity}`}
            </span>
            <span className="font-bold whitespace-nowrap">
              {takaRange(line.minPrice, line.maxPrice)}
            </span>
          </li>
        ))}
      </ul>
      <p className="flex items-start gap-2 text-sm text-muted">
        <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        Parts are extra. You and the karigor agree the final price after they check. From Karigor's
        Dhaka price list.
      </p>
    </section>
  );
}
