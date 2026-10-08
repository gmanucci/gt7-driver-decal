import type { FontDefinition, GlyphDefinition } from '@gt7/core';
import { minifyPathData } from '@gt7/core';
import opentype from 'opentype.js';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Characters bundled with every built-in font. Names are upper-cased by the NameFormatter. */
export function glyphCharacters(): string[] {
  const characters = new Set<string>();
  const add = (from: number, to: number) => {
    for (let code = from; code <= to; code++) characters.add(String.fromCodePoint(code));
  };

  add(0x41, 0x5a); // A-Z
  add(0x30, 0x39); // 0-9
  for (const character of " .,-'&/#!?:+") characters.add(character);
  characters.add('\u2019'); // right single quotation mark, common in names (O’Brien)
  add(0xc0, 0xde); // Latin-1 upper-case letters
  characters.delete('\u00d7'); // multiplication sign
  characters.add('\u0152'); // Œ
  characters.add('\u0178'); // Ÿ
  return [...characters];
}

export interface BuildFontOptions {
  id: string;
  name: string;
  data: ArrayBuffer;
  /** Pair adjustments smaller than this (font units) are ignored. */
  minKerning?: number;
}

export interface BuiltFont {
  font: FontDefinition;
  missing: string[];
  pathBytes: { average: number; max: number };
  kerningPairs: number;
}

const round = (value: number) => Math.round(value);

/** Relative, integer-rounded path data. Rounding is applied to absolute points so errors never accumulate. */
export function toCompactPath(commands: any[]): string {
  const parts: string[] = [];
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let last = '';

  const push = (letter: string, ...numbers: number[]) => {
    const repeated = letter === last && letter !== 'm';
    // A bare number needs a space after the previous one; a negative sign already separates.
    const joined = numbers.map((value, i) => (i === 0 && !repeated ? `${value}` : value < 0 ? `${value}` : ` ${value}`)).join('');
    parts.push(repeated ? joined : `${letter}${joined}`);
    last = letter;
  };

  for (let index = 0; index < commands.length; index++) {
    const command = commands[index];
    switch (command.type) {
      case 'M': {
        const nx = round(command.x);
        const ny = round(command.y);
        if (parts.length === 0) {
          push('M', nx, ny);
        } else {
          push('m', nx - x, ny - y);
        }
        x = startX = nx;
        y = startY = ny;
        break;
      }
      case 'L': {
        const nx = round(command.x);
        const ny = round(command.y);
        const next = commands[index + 1];
        const closesOnStart = nx === startX && ny === startY && next?.type === 'Z';
        if (!closesOnStart && (nx !== x || ny !== y)) {
          if (ny === y) push('h', nx - x);
          else if (nx === x) push('v', ny - y);
          else push('l', nx - x, ny - y);
        }
        x = nx;
        y = ny;
        break;
      }
      case 'Q': {
        const nx = round(command.x);
        const ny = round(command.y);
        push('q', round(command.x1) - x, round(command.y1) - y, nx - x, ny - y);
        x = nx;
        y = ny;
        break;
      }
      case 'C': {
        const nx = round(command.x);
        const ny = round(command.y);
        push('c', round(command.x1) - x, round(command.y1) - y, round(command.x2) - x, round(command.y2) - y, nx - x, ny - y);
        x = nx;
        y = ny;
        break;
      }
      case 'Z':
        push('z');
        x = startX;
        y = startY;
        break;
    }
  }
  return minifyPathData(parts.join(''), 0);
}

export function buildFont(options: BuildFontOptions): BuiltFont {
  const parsed = opentype.parse(options.data);
  const unitsPerEm: number = parsed.unitsPerEm;
  const characters = glyphCharacters();

  const glyphs: Record<string, GlyphDefinition> = {};
  const missing: string[] = [];
  const glyphByCharacter = new Map<string, any>();

  for (const character of characters) {
    const glyph = parsed.charToGlyph(character);
    if (!glyph || glyph.index === 0) {
      missing.push(character);
      continue;
    }
    glyphByCharacter.set(character, glyph);
    glyphs[character] = {
      path: toCompactPath(glyph.getPath(0, 0, unitsPerEm).commands),
      advanceWidth: round(glyph.advanceWidth ?? 0),
    };
  }

  const kerning: Record<string, number> = {};
  const minKerning = options.minKerning ?? 8;
  for (const [left, leftGlyph] of glyphByCharacter) {
    for (const [right, rightGlyph] of glyphByCharacter) {
      const value = round(parsed.getKerningValue(leftGlyph, rightGlyph) as number);
      if (Math.abs(value) >= minKerning) kerning[left + right] = value;
    }
  }

  const capHeight = round(parsed.charToGlyph('H').getBoundingBox().y2);
  const font: FontDefinition = {
    id: options.id,
    name: options.name,
    unitsPerEm,
    ascender: round(parsed.ascender),
    descender: round(parsed.descender),
    capHeight,
    glyphs,
    ...(Object.keys(kerning).length > 0 ? { kerning } : {}),
  };

  const sizes = Object.values(glyphs)
    .filter((glyph) => glyph.path !== '')
    .map((glyph) => glyph.path.length);
  return {
    font,
    missing,
    pathBytes: {
      average: sizes.reduce((sum, size) => sum + size, 0) / Math.max(1, sizes.length),
      max: Math.max(0, ...sizes),
    },
    kerningPairs: Object.keys(kerning).length,
  };
}
