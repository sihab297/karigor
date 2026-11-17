import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Paged } from '../../pages/admin/admin-types';

// "Showing 21–40 of 109" with previous and next buttons
export function Pager({ paged, onPage }: { paged: Paged; onPage: (page: number) => void }) {
  if (paged.total === 0) return null;
  const from = (paged.page - 1) * paged.pageSize + 1;
  const to = Math.min(paged.total, paged.page * paged.pageSize);
  const last = Math.ceil(paged.total / paged.pageSize);
  const button =
    'grid size-10 place-items-center rounded-box border-[1.5px] border-line bg-white hover:border-tea disabled:opacity-40';
  return (
    <div className="flex items-center justify-between gap-3 text-sm text-muted">
      <span>
        Showing {from}–{to} of {paged.total}
      </span>
      <span className="flex gap-1.5">
        <button
          type="button"
          className={button}
          aria-label="Previous page"
          disabled={paged.page <= 1}
          onClick={() => onPage(paged.page - 1)}
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={button}
          aria-label="Next page"
          disabled={paged.page >= last}
          onClick={() => onPage(paged.page + 1)}
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </span>
    </div>
  );
}
