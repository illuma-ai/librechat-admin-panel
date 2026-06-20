import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils';
import { useLocalize } from '@/hooks';
import type * as t from '@/types';

export function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | 'ellipsis')[] = [1];
  const windowStart = Math.max(2, current - 1);
  const windowEnd = Math.min(total - 1, current + 1);
  if (windowStart > 2) pages.push('ellipsis');
  for (let i = windowStart; i <= windowEnd; i++) pages.push(i);
  if (windowEnd < total - 1) pages.push('ellipsis');
  pages.push(total);
  return pages;
}

const ARROW_CLASS =
  'flex size-8 items-center justify-center rounded-md border border-(--cui-color-stroke-default) text-(--cui-color-text-default) outline-none transition-colors hover:bg-(--cui-color-background-hover) disabled:cursor-not-allowed disabled:opacity-40';

/** Token-only pagination (prev / numbered pages with ellipsis / next). */
export function Pagination({ currentPage, totalPages, onPageChange }: t.PaginationProps) {
  const localize = useLocalize();
  if (totalPages <= 1) return null;
  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <nav className="flex items-center gap-1" aria-label={localize('com_a11y_pagination')}>
      <button
        type="button"
        className={ARROW_CLASS}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label={localize('com_a11y_previous_page')}
      >
        <ChevronLeft className="size-4" />
      </button>
      {pages.map((page, index) =>
        page === 'ellipsis' ? (
          <span
            key={`ellipsis-${index}`}
            className="flex size-8 items-center justify-center text-(--cui-color-text-muted)"
          >
            …
          </span>
        ) : (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            aria-current={page === currentPage ? 'page' : undefined}
            aria-label={localize('com_a11y_page_n', { page: String(page) })}
            className={cn(
              'flex size-8 cursor-pointer items-center justify-center rounded-md border text-sm outline-none transition-colors',
              page === currentPage
                ? 'border-(--cui-color-accent) bg-(--cui-color-accent) font-medium text-(--cui-color-text-on-accent)'
                : 'border-(--cui-color-stroke-default) text-(--cui-color-text-default) hover:bg-(--cui-color-background-hover)',
            )}
          >
            {page}
          </button>
        ),
      )}
      <button
        type="button"
        className={ARROW_CLASS}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label={localize('com_a11y_next_page')}
      >
        <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}
