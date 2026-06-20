import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { getPageNumbers, Pagination } from './Pagination';

const TRANSLATIONS: Record<string, string> = {
  com_a11y_pagination: 'Pagination',
  com_a11y_previous_page: 'Previous page',
  com_a11y_next_page: 'Next page',
  com_a11y_page_n: 'Page {{page}}',
};

vi.mock('@/hooks/useLocalize', () => ({
  default: () => (key: string, opts?: Record<string, string>) => {
    let str = TRANSLATIONS[key] ?? key;
    if (opts) for (const [k, v] of Object.entries(opts)) str = str.replace(`{{${k}}}`, v);
    return str;
  },
  useLocalize: () => (key: string, opts?: Record<string, string>) => {
    let str = TRANSLATIONS[key] ?? key;
    if (opts) for (const [k, v] of Object.entries(opts)) str = str.replace(`{{${k}}}`, v);
    return str;
  },
}));

describe('getPageNumbers', () => {
  it('returns all pages when total <= 7', () => {
    expect(getPageNumbers(1, 1)).toEqual([1]);
    expect(getPageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getPageNumbers(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('shows right ellipsis when current is near start', () => {
    expect(getPageNumbers(1, 10)).toEqual([1, 2, 'ellipsis', 10]);
  });

  it('shows left ellipsis when current is near end', () => {
    expect(getPageNumbers(10, 10)).toEqual([1, 'ellipsis', 9, 10]);
  });

  it('shows both ellipses when current is in the middle', () => {
    expect(getPageNumbers(5, 10)).toEqual([1, 'ellipsis', 4, 5, 6, 'ellipsis', 10]);
  });

  it('suppresses left ellipsis when window touches page 2', () => {
    expect(getPageNumbers(3, 10)).toEqual([1, 2, 3, 4, 'ellipsis', 10]);
  });

  it('suppresses right ellipsis when window touches second-to-last', () => {
    expect(getPageNumbers(8, 10)).toEqual([1, 'ellipsis', 7, 8, 9, 10]);
  });

  it('handles exactly 8 pages (boundary for ellipsis)', () => {
    expect(getPageNumbers(1, 8)).toEqual([1, 2, 'ellipsis', 8]);
    expect(getPageNumbers(4, 8)).toEqual([1, 'ellipsis', 3, 4, 5, 'ellipsis', 8]);
    expect(getPageNumbers(8, 8)).toEqual([1, 'ellipsis', 7, 8]);
  });
});

describe('Pagination', () => {
  it('renders nothing when totalPages <= 1', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} onPageChange={() => {}} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders a pagination nav with the active page when totalPages > 1', () => {
    const onPageChange = vi.fn();
    render(<Pagination currentPage={2} totalPages={5} onPageChange={onPageChange} />);

    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
    expect(screen.getByRole('button', { current: 'page' })).toHaveTextContent('2');

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
