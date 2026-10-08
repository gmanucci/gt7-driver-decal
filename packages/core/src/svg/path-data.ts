import { formatNumber } from './number-format';

const PATH_TOKEN = /([a-zA-Z])|([-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?)/g;

/**
 * Rewrites path data in its shortest form: numbers rounded to `precision`
 * decimals, no redundant separators. Paths containing arcs are only
 * whitespace-normalized because arc flags may be written without separators.
 */
export function minifyPathData(value: string, precision = 2): string {
  if (/[aA]/.test(value)) {
    return value.replace(/\s+/g, ' ').trim();
  }

  let output = '';
  let previousNumber: string | undefined;
  for (const match of value.matchAll(PATH_TOKEN)) {
    if (match[1] !== undefined) {
      output += match[1];
      previousNumber = undefined;
      continue;
    }
    const formatted = formatNumber(Number(match[2]), precision);
    if (previousNumber !== undefined) {
      const compact =
        formatted.startsWith('-') || (formatted.startsWith('.') && previousNumber.includes('.'));
      if (!compact) output += ' ';
    }
    output += formatted;
    previousNumber = formatted;
  }
  return output;
}
