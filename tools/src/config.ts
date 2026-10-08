import { fileURLToPath } from 'node:url';

const fromRoot = (relative: string) => fileURLToPath(new URL(`../../${relative}`, import.meta.url));

export const FLAGS_OUTPUT = fromRoot('packages/assets/data/flags/flags.json');
export const FONTS_OUTPUT_DIR = fromRoot('packages/assets/data/fonts');
export const ASSETS_DATA_DIR = fromRoot('packages/assets/data');

/** Per-flag ceiling (bytes, as rendered). Leaves room for glyph outlines inside GT7's 15 KB. */
export const FLAG_BUDGET_BYTES = 4 * 1024;

/**
 * Highest REDUCTION_LEVELS index the flag build may use. Flags that don't fit the budget at this
 * level are skipped rather than degraded; raise it to ship simplified flags.
 */
export const MAX_REDUCTION_LEVEL = 0;

/**
 * Per-country exceptions to the flag budget and reduction level, for flags too important to drop
 * but too detailed to fit the default. A 7 KB flag plus a long name still stays under 12 KB.
 */
export const FLAG_OVERRIDES: Readonly<Record<string, { budgetBytes: number; maxLevel: number }>> = {
  BR: { budgetBytes: 7 * 1024, maxLevel: 13 },
  AR: { budgetBytes: 7 * 1024, maxLevel: 13 },
  ES: { budgetBytes: 7 * 1024, maxLevel: 13 },
  MX: { budgetBytes: 7 * 1024, maxLevel: 13 },
  PT: { budgetBytes: 7 * 1024, maxLevel: 13 },
};
