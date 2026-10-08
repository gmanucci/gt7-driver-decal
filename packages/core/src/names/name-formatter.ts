export type NameMode = 'initial' | 'full' | 'initial-last' | 'last';

export const NAME_MODES: readonly NameMode[] = ['initial', 'full', 'initial-last', 'last'];

export interface NameFormatter {
  format(name: string, mode: NameMode): string;
}

/**
 * Pure string formatting, independent of fonts and layouts.
 * The last whitespace-separated token is treated as the last name
 * (so "van der Berg" yields "BERG"); a single-token name is returned whole
 * for every mode except 'initial'.
 */
export class DefaultNameFormatter implements NameFormatter {
  format(name: string, mode: NameMode): string {
    const parts = name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.toUpperCase());

    const first = parts[0];
    const last = parts[parts.length - 1];
    if (first === undefined || last === undefined) {
      return '';
    }

    const initial = Array.from(first)[0] ?? '';

    switch (mode) {
      case 'initial':
        return initial;
      case 'full':
        return parts.join(' ');
      case 'initial-last':
        return parts.length === 1 ? first : `${initial} ${last}`;
      case 'last':
        return last;
      default:
        throw new RangeError(`Unknown name mode: "${String(mode)}"`);
    }
  }
}
