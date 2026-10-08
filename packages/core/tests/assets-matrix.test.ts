import { describe, expect, it } from 'vitest';
import {
  DefaultDecalGenerator,
  GT7_MAX_BYTES,
  NAME_MODES,
  TARGET_BYTES,
  builtInLayouts,
} from '@gt7/core';
import { builtInFlags, builtInFonts, createFlagService, createFontService } from '@gt7/assets';

const generator = new DefaultDecalGenerator({ flags: createFlagService(), fonts: createFontService() });

// Worst cases: many distinct glyphs, long names.
const NAMES = ['Max Verstappen', 'Pierre-Gasly Jr', 'Alexander Zvyagintsev-Quixote'];

describe('built-in assets', () => {
  it('ships flags and three fonts', () => {
    expect(builtInFlags.length).toBeGreaterThan(150);
    expect(builtInFonts.map((font) => font.id).sort()).toEqual(['orbitron', 'rajdhani', 'saira']);
  });

  it('draws A-Z, 0-9 and space in every font', () => {
    for (const font of builtInFonts) {
      for (const char of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ') {
        expect(font.glyphs[char], `${font.id} "${char}"`).toBeDefined();
      }
    }
  });

  it('keeps every country x font x layout x name mode within 15 KB', () => {
    const over15: string[] = [];
    const over12: string[] = [];
    let worst = 0;

    for (const flag of builtInFlags) {
      for (const font of builtInFonts) {
        for (const layout of builtInLayouts) {
          for (const nameMode of NAME_MODES) {
            for (const name of NAMES) {
              const decal = generator.generate({
                country: flag.countryCode,
                name,
                nameMode,
                font: font.id,
                layout: layout.id,
              });
              worst = Math.max(worst, decal.sizeBytes);
              const label = `${flag.countryCode}/${font.id}/${layout.id}/${nameMode}/${name}=${decal.sizeBytes}`;
              if (decal.sizeBytes > GT7_MAX_BYTES) over15.push(label);
              else if (decal.sizeBytes > TARGET_BYTES) over12.push(label);
            }
          }
        }
      }
    }

    console.log(`worst decal: ${worst} B; ${over12.length} between 12 and 15 KB`);
    expect(over15.slice(0, 10)).toEqual([]);
  }, 60_000);
});
