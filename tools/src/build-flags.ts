import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { FLAGS_OUTPUT, FLAG_BUDGET_BYTES, MAX_REDUCTION_LEVEL } from './config.ts';
import { buildFlag, REDUCTION_LEVELS, type BuiltFlag } from './flag-builder.ts';
import { createPaperEnv } from './paper-env.ts';

interface CountryEntry {
  code: string;
  name: string;
  flag_4x3: string;
  iso: boolean;
}

const require = createRequire(import.meta.url);
const flagIconsDir = dirname(require.resolve('flag-icons/package.json'));
const countries: CountryEntry[] = JSON.parse(readFileSync(join(flagIconsDir, 'country.json'), 'utf8'));

const only = process.argv.slice(2).map((code) => code.toLowerCase());
const selected = countries
  .filter((country) => country.iso && (only.length === 0 || only.includes(country.code)))
  .sort((a, b) => a.code.localeCompare(b.code));

const env = createPaperEnv();
const built: BuiltFlag[] = [];
const failures: string[] = [];

for (const country of selected) {
  try {
    const svg = readFileSync(join(flagIconsDir, country.flag_4x3), 'utf8');
    built.push(
      buildFlag(
        env,
        { countryCode: country.code.toUpperCase(), name: country.name, svg },
        FLAG_BUDGET_BYTES,
        MAX_REDUCTION_LEVEL,
      ),
    );
  } catch (error) {
    failures.push(`${country.code}: ${error instanceof Error ? (error.stack ?? error.message).split('\n').slice(0, 4).join(' | ') : String(error)}`);
  }
}

const reduced = built.filter((entry) => entry.level > 0);
const overBudget = built.filter((entry) => !entry.withinBudget);
const warned = new Map<string, string[]>();
for (const entry of built) {
  for (const warning of entry.warnings) {
    warned.set(warning, [...(warned.get(warning) ?? []), entry.flag.countryCode]);
  }
}

const total = built.reduce((sum, entry) => sum + entry.bytes, 0);
console.log(`Built ${built.length}/${selected.length} flags, ${(total / 1024).toFixed(1)} KB rendered in total`);
console.log(
  `Average ${(total / Math.max(1, built.length)).toFixed(0)} B, largest ${Math.max(0, ...built.map((e) => e.bytes))} B`,
);
console.log(`Simplified beyond level 0: ${reduced.length}`);
for (const [index] of REDUCTION_LEVELS.entries()) {
  const count = built.filter((entry) => entry.level === index).length;
  if (count > 0) console.log(`  level ${index}: ${count}`);
}
for (const [warning, codes] of warned) {
  console.log(`warning "${warning}": ${codes.length} flags (${codes.slice(0, 12).join(' ')}${codes.length > 12 ? ' ...' : ''})`);
}
for (const entry of overBudget) {
  console.log(`SKIPPED (over budget) ${entry.flag.countryCode}: ${entry.bytes} B`);
}
for (const failure of failures) console.error(`FAILED ${failure}`);

const shipped = built.filter((entry) => entry.withinBudget);
if (only.length === 0) {
  mkdirSync(dirname(FLAGS_OUTPUT), { recursive: true });
  writeFileSync(FLAGS_OUTPUT, JSON.stringify(shipped.map((entry) => entry.flag)) + '\n');
  console.log(`Wrote ${shipped.length} flags to ${FLAGS_OUTPUT}`);
} else {
  console.log('Partial build (country filter): output not written.');
}

if (failures.length > 0) process.exitCode = 1;
