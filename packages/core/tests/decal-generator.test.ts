import { describe, expect, it } from 'vitest';
import { builtInLayouts } from '../src/composition/layouts';
import { UnknownFlagError, UnknownFontError, UnknownLayoutError } from '../src/errors';
import { InMemoryFlagRepository } from '../src/flags/flag-repository';
import { DefaultFlagService } from '../src/flags/flag-service';
import { DefaultFontService } from '../src/fonts/font-service';
import { NAME_MODES } from '../src/names/name-formatter';
import { DefaultDecalGenerator } from '../src/decal/decal-generator';
import { GT7_MAX_BYTES, TARGET_BYTES, utf8ByteLength } from '../src/svg/svg-size-validator';
import { brazil, createTestFont, japan } from './fixtures';

const font = createTestFont();
const generator = new DefaultDecalGenerator({
  flags: new DefaultFlagService(new InMemoryFlagRepository([brazil, japan])),
  fonts: new DefaultFontService([font]),
});

const request = {
  country: 'BR',
  name: 'Guilherme Manucci',
  nameMode: 'initial-last',
  font: 'test',
  layout: 'horizontal',
} as const;

describe('DefaultDecalGenerator', () => {
  it('generates a valid decal from a request', () => {
    const result = generator.generate(request);
    expect(result.text).toBe('G MANUCCI');
    expect(result.width).toBe(500);
    expect(result.height).toBe(120);
    expect(result.sizeBytes).toBe(utf8ByteLength(result.svg));
    expect(result.valid).toBe(true);
    expect(result.svg).toContain('viewBox="0 0 500 120"');
    expect(result.missingCharacters).toEqual([]);
  });

  it('is deterministic', () => {
    expect(generator.generate(request).svg).toBe(generator.generate({ ...request }).svg);
  });

  it('keeps the SVG free of text, fonts and raster images', () => {
    const { svg } = generator.generate(request);
    expect(svg).not.toMatch(/<text|<image|<style|font-family|data:image|@font-face|<metadata/);
    expect(svg).not.toMatch(/>\s+</);
  });

  it('shrinks when the font reuses glyphs', () => {
    const repeated = generator.generate({ ...request, name: 'AAAA AAAA', nameMode: 'full' });
    const distinct = generator.generate({ ...request, name: 'ABCD EFGH', nameMode: 'full' });
    expect(repeated.sizeBytes).toBeLessThan(distinct.sizeBytes);
  });

  it('renders text only when no country is given', () => {
    const result = generator.generate({ ...request, country: undefined });
    expect(result.svg).not.toContain('#009c3b');
  });

  it('reports characters the font cannot draw', () => {
    expect(generator.generate({ ...request, name: 'Zé Silva', nameMode: 'full' }).missingCharacters).toEqual(['É']);
  });

  it('honors custom canvas dimensions', () => {
    const result = generator.generate({ ...request, width: 256, height: 64 });
    expect(result).toMatchObject({ width: 256, height: 64 });
  });

  it('throws for unknown country, font and layout', () => {
    expect(() => generator.generate({ ...request, country: 'XX' })).toThrow(UnknownFlagError);
    expect(() => generator.generate({ ...request, font: 'nope' })).toThrow(UnknownFontError);
    expect(() => generator.generate({ ...request, layout: 'nope' })).toThrow(UnknownLayoutError);
  });

  it('exposes the registered layouts', () => {
    expect(generator.getLayouts().map((layout) => layout.id)).toEqual(builtInLayouts.map((layout) => layout.id));
  });

  it('marks oversized decals invalid', () => {
    const result = generator.generate({ ...request, name: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ '.repeat(600), nameMode: 'full' });
    expect(result.sizeBytes).toBeGreaterThan(GT7_MAX_BYTES);
    expect(result).toMatchObject({ valid: false, status: 'invalid' });
  });

  describe('built-in combinations', () => {
    const names = ['Guilherme Manucci', 'A B', 'Maximilian Verstappen Jr'];
    for (const flag of [brazil, japan]) {
      for (const layout of builtInLayouts) {
        for (const nameMode of NAME_MODES) {
          it(`${flag.countryCode} / ${layout.id} / ${nameMode} stays within the GT7 target`, () => {
            for (const name of names) {
              const { sizeBytes, valid } = generator.generate({
                country: flag.countryCode,
                name,
                nameMode,
                font: 'test',
                layout: layout.id,
              });
              expect(valid).toBe(true);
              expect(sizeBytes).toBeLessThanOrEqual(TARGET_BYTES);
            }
          });
        }
      }
    }
  });
});
