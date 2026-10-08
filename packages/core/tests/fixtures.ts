import type { Flag } from '../src/flags/flag';
import type { FontDefinition, GlyphDefinition } from '../src/fonts/font';

const BLOCK_ADVANCE = 700;

function block(advanceWidth = BLOCK_ADVANCE, variant = 0): GlyphDefinition {
  // Box from the baseline up to cap height (y-down, so negative y), 50 unit side bearings.
  // `variant` shifts one corner so different characters have different outlines.
  return { path: `M50 -700H${advanceWidth - 50}V0H${50 + variant}Z`, advanceWidth };
}

/** Deterministic block font: every A-Z / 0-9 glyph is a box, with distinct widths for A, I and W. */
export function createTestFont(id = 'test'): FontDefinition {
  const glyphs: Record<string, GlyphDefinition> = { ' ': { path: '', advanceWidth: 300 } };
  [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'].forEach((character, index) => {
    glyphs[character] = block(BLOCK_ADVANCE, index);
  });
  glyphs['I'] = block(300, 8);
  glyphs['W'] = block(900, 22);

  return {
    id,
    name: 'Test Block',
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    capHeight: 700,
    glyphs,
    kerning: { AV: -100 },
  };
}

export const brazil: Flag = {
  countryCode: 'BR',
  name: 'Brazil',
  width: 700,
  height: 490,
  elements: [
    { type: 'rect', width: 700, height: 490, fill: '#009c3b' },
    { type: 'path', d: 'M350 45L655 245L350 445L45 245Z', fill: '#ffdf00' },
    { type: 'circle', cx: 350, cy: 245, r: 100, fill: '#002776' },
  ],
};

export const japan: Flag = {
  countryCode: 'JP',
  name: 'Japan',
  width: 900,
  height: 600,
  elements: [
    { type: 'rect', width: 900, height: 600, fill: '#ffffff' },
    { type: 'circle', cx: 450, cy: 300, r: 180, fill: '#bc002d' },
  ],
};
