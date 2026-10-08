/**
 * All coordinates are in font units, y-down, with the origin on the baseline
 * (so glyph outlines extend to negative y).
 */
export interface GlyphDefinition {
  path: string;
  advanceWidth: number;
  width?: number;
  height?: number;
}

export interface FontDefinition {
  id: string;
  name: string;
  unitsPerEm: number;
  ascender: number;
  descender: number;
  /** Height of upper-case letters. Text is sized by this value; falls back to `ascender`. */
  capHeight?: number;
  glyphs: Record<string, GlyphDefinition>;
  /** Keyed by the two characters of the pair, e.g. "AV". Values are added to the first advance. */
  kerning?: Record<string, number>;
}
