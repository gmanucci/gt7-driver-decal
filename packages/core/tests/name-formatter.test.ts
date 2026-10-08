import { describe, expect, it } from 'vitest';
import { DefaultNameFormatter, NAME_MODES } from '../src/names/name-formatter';

const formatter = new DefaultNameFormatter();

describe('DefaultNameFormatter', () => {
  it.each([
    ['initial', 'G'],
    ['full', 'GUILHERME MANUCCI'],
    ['initial-last', 'G MANUCCI'],
    ['last', 'MANUCCI'],
  ] as const)('formats "Guilherme Manucci" as %s', (mode, expected) => {
    expect(formatter.format('Guilherme Manucci', mode)).toBe(expected);
  });

  it('trims and collapses whitespace', () => {
    expect(formatter.format('  guilherme    manucci ', 'full')).toBe('GUILHERME MANUCCI');
  });

  it('uses the last token as the last name', () => {
    expect(formatter.format('Max Emilian Verstappen', 'initial-last')).toBe('M VERSTAPPEN');
    expect(formatter.format('Max Emilian Verstappen', 'last')).toBe('VERSTAPPEN');
  });

  it('keeps a single-token name whole except for "initial"', () => {
    expect(formatter.format('senna', 'initial')).toBe('S');
    expect(formatter.format('senna', 'initial-last')).toBe('SENNA');
    expect(formatter.format('senna', 'last')).toBe('SENNA');
    expect(formatter.format('senna', 'full')).toBe('SENNA');
  });

  it('handles accents and non-BMP initials', () => {
    expect(formatter.format('érik Åberg', 'initial-last')).toBe('É ÅBERG');
    expect(formatter.format('𝒜lpha Beta', 'initial')).toBe('𝒜');
  });

  it('returns an empty string for blank input in every mode', () => {
    for (const mode of NAME_MODES) {
      expect(formatter.format('   ', mode)).toBe('');
    }
  });

  it('rejects an unknown mode', () => {
    expect(() => formatter.format('A B', 'nope' as never)).toThrow(RangeError);
  });
});
