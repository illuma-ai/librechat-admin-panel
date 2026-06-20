import { useCallback, useEffect, useState } from 'react';

/** A named, persisted snapshot of a table's filter/column/sort state. */
export interface SavedView {
  id: string;
  name: string;
  /** Opaque slice of the route search params that defines the view. */
  state: Record<string, unknown>;
}

const STORAGE_PREFIX = 'tracing-views-';

function storageKey(tableKey: string): string {
  return `${STORAGE_PREFIX}${tableKey}`;
}

/** Read the persisted views for a table; tolerant of malformed/empty storage. */
function readViews(key: string): SavedView[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is SavedView =>
        typeof v === 'object' &&
        v !== null &&
        typeof (v as SavedView).id === 'string' &&
        typeof (v as SavedView).name === 'string' &&
        typeof (v as SavedView).state === 'object',
    );
  } catch {
    return [];
  }
}

function writeViews(key: string, views: SavedView[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(views));
  } catch {
    /* storage full / unavailable — views are best-effort, never block the UI */
  }
}

/** Stable-enough id without relying on workflow-banned randomness in app code. */
function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `v_${Date.now().toString(36)}`;
}

/**
 * Per-table saved-view store backed by `localStorage` (mirrors the reference's
 * saved Views). Returns the views plus save/delete actions; reads are SSR-safe.
 */
export function useSavedViews(tableKey: string) {
  const key = storageKey(tableKey);
  const [views, setViews] = useState<SavedView[]>(() => readViews(key));

  // Re-read when the table changes (the hook may persist across tab switches).
  useEffect(() => {
    setViews(readViews(key));
  }, [key]);

  const persist = useCallback(
    (next: SavedView[]) => {
      setViews(next);
      writeViews(key, next);
    },
    [key],
  );

  const saveView = useCallback(
    (name: string, state: Record<string, unknown>) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setViews((prev) => {
        // Overwrite a same-named view rather than duplicating it.
        const without = prev.filter((v) => v.name !== trimmed);
        const next = [...without, { id: newId(), name: trimmed, state }];
        writeViews(key, next);
        return next;
      });
    },
    [key],
  );

  const deleteView = useCallback(
    (id: string) => {
      setViews((prev) => {
        const next = prev.filter((v) => v.id !== id);
        writeViews(key, next);
        return next;
      });
    },
    [key],
  );

  return { views, saveView, deleteView, persist };
}
