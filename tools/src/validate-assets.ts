import { builtInFlags, builtInFonts } from '@gt7/assets';
import { DefaultSvgOptimizer, DefaultSvgRenderer, utf8ByteLength } from '@gt7/core';
import { FLAG_BUDGET_BYTES } from './config.ts';

const errors: string[] = [];
const FORBIDDEN = /<image|<filter|mix-blend-mode|feBlend|<style|base64/i;
const REQUIRED_GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';
const ARGUMENT_COUNTS: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };

/** Returns a problem description, or undefined when the path data is well-formed. */
function pathProblem(d: string): string | undefined {
  const segments = d.match(/[a-z][^a-z]*/gi);
  if (!segments || segments.join('') !== d) return 'unparseable path data';
  for (const segment of segments) {
    const letter = segment[0]!.toLowerCase();
    const expected = ARGUMENT_COUNTS[letter];
    if (expected === undefined) return `unknown command "${segment[0]}"`;
    const numbers = segment.slice(1).match(/-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/gi) ?? [];
    if (segment.slice(1).replace(/-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?|[\s,]/gi, '') !== '') return `bad number in "${segment}"`;
    if (expected === 0 ? numbers.length !== 0 : numbers.length === 0 || numbers.length % expected !== 0) {
      return `"${segment}" has ${numbers.length} numbers, expected a multiple of ${expected}`;
    }
  }
  return undefined;
}

const seen = new Set<string>();
for (const flag of builtInFlags) {
  for (const element of flag.elements) {
    const problem = element.type === 'path' ? pathProblem(element.d) : undefined;
    if (problem) errors.push(`flag ${flag.countryCode}: ${problem}`);
  }
  if (!/^[A-Z]{2}$/.test(flag.countryCode)) errors.push(`flag ${flag.countryCode}: invalid code`);
  if (seen.has(flag.countryCode)) errors.push(`flag ${flag.countryCode}: duplicate`);
  seen.add(flag.countryCode);
  if (flag.elements.length === 0) errors.push(`flag ${flag.countryCode}: no elements`);

  const svg = new DefaultSvgOptimizer().optimize(
    new DefaultSvgRenderer().render({
      width: flag.width,
      height: flag.height,
      items: [{ kind: 'flag', flag, x: 0, y: 0, scale: 1 }],
    }),
  );
  const bytes = utf8ByteLength(svg);
  if (bytes > FLAG_BUDGET_BYTES) errors.push(`flag ${flag.countryCode}: ${bytes} B exceeds ${FLAG_BUDGET_BYTES} B`);
  if (FORBIDDEN.test(svg)) errors.push(`flag ${flag.countryCode}: forbidden construct`);
}

for (const font of builtInFonts) {
  for (const [char, glyph] of Object.entries(font.glyphs)) {
    const problem = glyph.path === '' ? undefined : pathProblem(glyph.path);
    if (problem) errors.push(`font ${font.id} "${char}": ${problem}`);
  }
  for (const char of REQUIRED_GLYPHS) {
    if (!font.glyphs[char]) errors.push(`font ${font.id}: missing glyph "${char}"`);
  }
}

console.log(`Validated ${builtInFlags.length} flags and ${builtInFonts.length} fonts.`);
if (errors.length > 0) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exitCode = 1;
} else {
  console.log('Assets OK');
}
