import { UnknownFontError } from '../errors';
import type { FontDefinition } from './font';
import type { Glyph, GlyphRun } from './glyph';

export const DEFAULT_GLYPH_SIZE = 100;

export interface GlyphRunOptions {
  /** Cap height of the resulting run in output units. */
  size?: number;
}

export interface FontService {
  getFonts(): FontDefinition[];
  get(id: string): FontDefinition;
  generate(text: string, font: FontDefinition, options?: GlyphRunOptions): GlyphRun;
}

export class DefaultFontService implements FontService {
  private readonly byId = new Map<string, FontDefinition>();

  constructor(fonts: readonly FontDefinition[] = []) {
    fonts.forEach((font) => this.register(font));
  }

  /** Adds or replaces a font (used for built-ins and, later, user-imported fonts). */
  register(font: FontDefinition): void {
    this.byId.set(font.id, font);
  }

  getFonts(): FontDefinition[] {
    return [...this.byId.values()];
  }

  get(id: string): FontDefinition {
    const font = this.byId.get(id);
    if (!font) {
      throw new UnknownFontError(id);
    }
    return font;
  }

  generate(text: string, font: FontDefinition, options: GlyphRunOptions = {}): GlyphRun {
    const size = options.size ?? DEFAULT_GLYPH_SIZE;
    const capHeight = font.capHeight ?? font.ascender;
    const scale = size / capHeight;

    const glyphs: Glyph[] = [];
    const missing: string[] = [];
    let pen = 0;
    let previous: string | undefined;

    for (const character of Array.from(text)) {
      if (!Object.hasOwn(font.glyphs, character)) {
        if (!missing.includes(character)) {
          missing.push(character);
        }
        continue;
      }
      const definition = font.glyphs[character]!;

      if (previous !== undefined) {
        pen += font.kerning?.[previous + character] ?? 0;
      }

      glyphs.push({
        character,
        path: definition.path,
        width: definition.width ?? definition.advanceWidth,
        height: definition.height ?? capHeight,
        advanceWidth: definition.advanceWidth,
        x: pen,
        y: capHeight,
      });

      pen += definition.advanceWidth;
      previous = character;
    }

    return { text, glyphs, width: pen * scale, height: size, scale, missing };
  }
}
