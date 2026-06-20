import { useEffect, useState } from 'react';
import type { DataTableColumn } from './DataTable';

/**
 * Manage column visibility for a table (Langfuse "Columns N/M" menu). Initializes
 * from each column's `defaultHidden`, then restores any saved preference from
 * localStorage on the client (avoids SSR hydration mismatch).
 */
export function useColumnVisibility<T>(tableName: string, columns: DataTableColumn<T>[]) {
  const storageKey = `trace-cols-${tableName}`;
  const [hidden, setHidden] = useState<Set<string>>(
    () => new Set(columns.filter((c) => c.defaultHidden).map((c) => c.id)),
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setHidden(new Set(JSON.parse(stored) as string[]));
    } catch {
      // ignore malformed/absent storage
    }
  }, [storageKey]);

  const persist = (next: Set<string>) => {
    setHidden(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify([...next]));
    } catch {
      // ignore quota/availability errors
    }
  };

  const toggle = (id: string) => {
    const next = new Set(hidden);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    persist(next);
  };

  const toggleableColumns = columns.filter((c) => !c.fixed);
  const visibleCount = toggleableColumns.filter((c) => !hidden.has(c.id)).length;

  return { hidden, toggle, visibleCount, total: toggleableColumns.length };
}
