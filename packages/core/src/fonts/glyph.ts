/** A glyph positioned inside a run. Geometry is in font units; multiply by `GlyphRun.scale`. */
export interface Glyph {
  character: string;
  path: string;
  width: number;
  height: number;
  advanceWidth: number;
  /** Pen position from the run's left edge. */
  x: number;
  /** Baseline position from the run's top edge. */
  y: number;
}

export interface GlyphRun {
  text: string;
  glyphs: Glyph[];
  /** Output units (font units * scale). */
  width: number;
  height: number;
  /** Font units to output units. */
  scale: number;
  /** Characters the font has no glyph for; they are skipped. */
  missing: string[];
}
