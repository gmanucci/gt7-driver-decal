import { InvalidFontError } from '../errors';
import type { FontDefinition, GlyphDefinition } from './font';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  if (typeof value !== 'string' || value === '') {
    throw new InvalidFontError(`"${key}" must be a non-empty string`);
  }
  return value;
}

function requireNumber(source: Record<string, unknown>, key: string): number {
  const value = source[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new InvalidFontError(`"${key}" must be a finite number`);
  }
  return value;
}

/** Validates untrusted JSON (e.g. a bundled font.json) and returns a typed FontDefinition. */
export function parseFontDefinition(json: unknown): FontDefinition {
  if (!isRecord(json)) {
    throw new InvalidFontError('expected an object');
  }

  const unitsPerEm = requireNumber(json, 'unitsPerEm');
  const ascender = requireNumber(json, 'ascender');
  if (unitsPerEm <= 0 || ascender <= 0) {
    throw new InvalidFontError('"unitsPerEm" and "ascender" must be positive');
  }

  const rawGlyphs = json['glyphs'];
  if (!isRecord(rawGlyphs)) {
    throw new InvalidFontError('"glyphs" must be an object');
  }

  const glyphs: Record<string, GlyphDefinition> = {};
  for (const [character, raw] of Object.entries(rawGlyphs)) {
    if (!isRecord(raw)) {
      throw new InvalidFontError(`glyph "${character}" must be an object`);
    }
    const path = raw['path'];
    if (typeof path !== 'string') {
      throw new InvalidFontError(`glyph "${character}" needs a string "path"`);
    }
    const glyph: GlyphDefinition = { path, advanceWidth: requireNumber(raw, 'advanceWidth') };
    if (typeof raw['width'] === 'number') glyph.width = raw['width'];
    if (typeof raw['height'] === 'number') glyph.height = raw['height'];
    glyphs[character] = glyph;
  }

  const font: FontDefinition = {
    id: requireString(json, 'id'),
    name: requireString(json, 'name'),
    unitsPerEm,
    ascender,
    descender: requireNumber(json, 'descender'),
    glyphs,
  };

  if (json['capHeight'] !== undefined) {
    font.capHeight = requireNumber(json, 'capHeight');
  }

  const rawKerning = json['kerning'];
  if (rawKerning !== undefined) {
    if (!isRecord(rawKerning)) {
      throw new InvalidFontError('"kerning" must be an object');
    }
    const kerning: Record<string, number> = {};
    for (const [pair, value] of Object.entries(rawKerning)) {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new InvalidFontError(`kerning "${pair}" must be a finite number`);
      }
      kerning[pair] = value;
    }
    font.kerning = kerning;
  }

  return font;
}
