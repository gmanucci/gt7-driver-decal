import type { Flag } from '../flags/flag';
import type { GlyphRun } from '../fonts/glyph';

export type Alignment = 'left' | 'center' | 'right';

/**
 * Items are positioned by their top-left corner in output units.
 * `scale` multiplies the source's natural size (flag units, or the run's already-scaled size).
 */
export interface PlacedFlag {
  kind: 'flag';
  flag: Flag;
  x: number;
  y: number;
  scale: number;
}

export interface PlacedText {
  kind: 'text';
  run: GlyphRun;
  x: number;
  y: number;
  scale: number;
}

export type ComposedItem = PlacedFlag | PlacedText;

/** Geometry model handed to the SvgRenderer. */
export interface ComposedDecal {
  width: number;
  height: number;
  items: ComposedItem[];
}

export interface LayoutInput {
  flag?: Flag | undefined;
  glyphs: GlyphRun;
  gap: number;
  alignment: Alignment;
}

export interface DecalLayout {
  id: string;
  name: string;
  /** Returns tight content bounds with the origin at (0, 0); the composer fits it to the canvas. */
  compose(input: LayoutInput): ComposedDecal;
}
