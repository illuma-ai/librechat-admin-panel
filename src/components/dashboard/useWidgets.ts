import { useCallback, useEffect, useState } from 'react';
import type * as t from '@/types';

const STORAGE_KEY = 'tracing-widgets';

function read(): t.WidgetConfig[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (w): w is t.WidgetConfig =>
        typeof w === 'object' &&
        w !== null &&
        typeof (w as t.WidgetConfig).id === 'string' &&
        typeof (w as t.WidgetConfig).view === 'string',
    );
  } catch {
    return [];
  }
}

function write(items: t.WidgetConfig[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* best-effort */
  }
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `w_${Date.now().toString(36)}`;
}

/** Saved custom-widget store (localStorage), mirroring the dashboards/views pattern. */
export function useWidgets() {
  const [widgets, setWidgets] = useState<t.WidgetConfig[]>(() => read());

  useEffect(() => {
    setWidgets(read());
  }, []);

  const get = useCallback((id: string) => read().find((w) => w.id === id), []);

  const save = useCallback(
    (config: Omit<t.WidgetConfig, 'id' | 'createdAt' | 'updatedAt'>, existingId?: string): string => {
      const now = Date.now();
      const id = existingId ?? newId();
      setWidgets((prev) => {
        const without = prev.filter((w) => w.id !== id);
        const createdAt = prev.find((w) => w.id === id)?.createdAt ?? now;
        const next = [...without, { ...config, id, createdAt, updatedAt: now }];
        write(next);
        return next;
      });
      return id;
    },
    [],
  );

  const remove = useCallback((id: string) => {
    setWidgets((prev) => {
      const next = prev.filter((w) => w.id !== id);
      write(next);
      return next;
    });
  }, []);

  return { widgets, get, save, remove };
}
