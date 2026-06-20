import { useCallback, useEffect, useState } from 'react';
import type * as t from '@/types';

const STORAGE_KEY = 'tracing-dashboards';

function read(): t.SavedDashboard[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (d): d is t.SavedDashboard =>
        typeof d === 'object' &&
        d !== null &&
        typeof (d as t.SavedDashboard).id === 'string' &&
        typeof (d as t.SavedDashboard).name === 'string' &&
        Array.isArray((d as t.SavedDashboard).widgetIds),
    );
  } catch {
    return [];
  }
}

function write(items: t.SavedDashboard[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* storage full / unavailable — best-effort, never block the UI */
  }
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `d_${Date.now().toString(36)}`;
}

/**
 * Custom-dashboard store backed by `localStorage` (mirrors the Saved Views pattern).
 * Returns the dashboards plus create/update/remove actions; reads are SSR-safe.
 * Persistence is per-browser for now — a shared/DB-backed store is a later step.
 */
export function useDashboards() {
  const [dashboards, setDashboards] = useState<t.SavedDashboard[]>(() => read());

  useEffect(() => {
    setDashboards(read());
  }, []);

  const create = useCallback((name: string, description: string, widgetIds: string[]): string => {
    const id = newId();
    const now = Date.now();
    setDashboards((prev) => {
      const next = [
        ...prev,
        { id, name: name.trim() || 'Untitled dashboard', description, widgetIds, createdAt: now, updatedAt: now },
      ];
      write(next);
      return next;
    });
    return id;
  }, []);

  const update = useCallback((id: string, patch: Partial<Omit<t.SavedDashboard, 'id' | 'createdAt'>>) => {
    setDashboards((prev) => {
      const next = prev.map((d) =>
        d.id === id ? { ...d, ...patch, updatedAt: Date.now() } : d,
      );
      write(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setDashboards((prev) => {
      const next = prev.filter((d) => d.id !== id);
      write(next);
      return next;
    });
  }, []);

  return { dashboards, create, update, remove };
}
