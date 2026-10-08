import { describe, expect, it } from 'vitest';
import { UnknownFlagError, UnknownFontError } from '../src/errors';
import { InMemoryFlagRepository } from '../src/flags/flag-repository';
import { DefaultFlagService } from '../src/flags/flag-service';
import { parseFontDefinition } from '../src/fonts/font-loader';
import { DefaultFontService } from '../src/fonts/font-service';
import { brazil, createTestFont, japan } from './fixtures';

describe('DefaultFlagService', () => {
  const service = new DefaultFlagService(new InMemoryFlagRepository([brazil, japan]));

  it('returns flags by country code, case-insensitively', () => {
    expect(service.get('BR')).toBe(brazil);
    expect(service.get(' jp ')).toBe(japan);
  });

  it('lists all flags', () => {
    expect(service.getAll()).toEqual([brazil, japan]);
  });

  it('throws for an unknown country', () => {
    expect(() => service.get('XX')).toThrow(UnknownFlagError);
  });
});

describe('DefaultFontService', () => {
  const font = createTestFont();
  const service = new DefaultFontService([font]);

  it('looks fonts up by id', () => {
    expect(service.get('test')).toBe(font);
    expect(service.getFonts()).toEqual([font]);
    expect(() => service.get('missing')).toThrow(UnknownFontError);
  });

  it('turns a character into a glyph scaled to the requested size', () => {
    const run = service.generate('A', font, { size: 70 });
    expect(run.glyphs).toHaveLength(1);
    expect(run.glyphs[0]).toMatchObject({ character: 'A', x: 0, y: 700, advanceWidth: 700 });
    expect(run.scale).toBeCloseTo(0.1);
    expect(run.height).toBe(70);
    expect(run.width).toBeCloseTo(70);
  });

  it('positions glyphs of "ABC" by accumulated advance widths', () => {
    const run = service.generate('ABC', font);
    expect(run.glyphs.map((glyph) => glyph.x)).toEqual([0, 700, 1400]);
    expect(run.width).toBeCloseTo((2100 * 100) / 700);
  });

  it('positions repeated characters independently', () => {
    const run = service.generate('IWI', font);
    expect(run.glyphs.map((glyph) => glyph.x)).toEqual([0, 300, 1200]);
  });

  it('applies kerning between pairs', () => {
    const run = service.generate('AVA', font);
    expect(run.glyphs.map((glyph) => glyph.x)).toEqual([0, 600, 1300]);
  });

  it('reports characters the font cannot draw and skips them', () => {
    const run = service.generate('A?B?', font);
    expect(run.glyphs.map((glyph) => glyph.character)).toEqual(['A', 'B']);
    expect(run.missing).toEqual(['?']);
  });

  it('treats prototype property names as missing glyphs', () => {
    expect(service.generate('_', font).glyphs).toHaveLength(0);
  });

  it('returns an empty run for empty text', () => {
    const run = service.generate('', font);
    expect(run.glyphs).toEqual([]);
    expect(run.width).toBe(0);
  });

  it('allows registering fonts later', () => {
    const extra = new DefaultFontService();
    extra.register(createTestFont('imported'));
    expect(extra.get('imported').id).toBe('imported');
  });
});

describe('parseFontDefinition', () => {
  it('round-trips a valid font through JSON', () => {
    const font = createTestFont();
    expect(parseFontDefinition(JSON.parse(JSON.stringify(font)))).toEqual(font);
  });

  it.each([
    ['non-object', 'nope'],
    ['missing glyphs', { id: 'a', name: 'A', unitsPerEm: 1000, ascender: 800, descender: -200 }],
    ['bad advance', { id: 'a', name: 'A', unitsPerEm: 1000, ascender: 800, descender: -200, glyphs: { A: { path: '', advanceWidth: 'x' } } }],
    ['bad ascender', { id: 'a', name: 'A', unitsPerEm: 1000, ascender: 0, descender: -200, glyphs: {} }],
  ])('rejects %s', (_label, input) => {
    expect(() => parseFontDefinition(input)).toThrow(/Invalid font definition/);
  });
});
