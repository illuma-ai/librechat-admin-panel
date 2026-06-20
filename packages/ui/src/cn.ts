import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';

/** Conditional className merge (clsx wrapper). Self-contained so the package has no app deps. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(...inputs);
}
