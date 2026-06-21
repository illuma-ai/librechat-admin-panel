/**
 * Dashboard domain constants — single source for score data-types and observation
 * levels (the values our ClickHouse `scores.data_type` / `observations.level` columns
 * carry). Use these instead of scattering string literals across queries and UI.
 */

/** Score value kinds (ClickHouse `scores.data_type`). */
export const ScoreDataType = {
  NUMERIC: 'NUMERIC',
  BOOLEAN: 'BOOLEAN',
  CATEGORICAL: 'CATEGORICAL',
} as const;
export type ScoreDataType = (typeof ScoreDataType)[keyof typeof ScoreDataType];

/** Observation severity levels (ClickHouse `observations.level`; '' normalizes to DEFAULT). */
export const ObservationLevel = {
  DEFAULT: 'DEFAULT',
  DEBUG: 'DEBUG',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
} as const;
export type ObservationLevel = (typeof ObservationLevel)[keyof typeof ObservationLevel];

/** Stable display order for level series/pills (reference: DEFAULT → DEBUG → WARNING → ERROR). */
export const OBSERVATION_LEVEL_ORDER: readonly string[] = [
  ObservationLevel.DEFAULT,
  ObservationLevel.DEBUG,
  ObservationLevel.WARNING,
  ObservationLevel.ERROR,
];
