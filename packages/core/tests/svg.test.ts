import { describe, expect, it } from 'vitest';
import { DefaultSvgOptimizer } from '../src/svg/svg-optimizer';
import { DefaultSvgRenderer } from '../src/svg/svg-renderer';
import { DefaultSvgSizeValidator, GT7_MAX_BYTES, TARGET_BYTES, utf8ByteLength } from '../src/svg/svg-size-validator';
import { formatNumber } from '../src/svg/number-format';
import { DefaultDecalComposer } from '../src/composition/decal-composer';
import { horizontalLayout } from '../src/composition/layouts';
import { DefaultFontService } from '../src/fonts/font-service';
import { brazil, createTestFont } from './fixtures';

const font = createTestFont();
const fonts = new DefaultFontService([font]);

function renderDecal(text: string) {
  const decal = new DefaultDecalComposer().compose({
    flag: brazil,
    glyphs: fonts.generate(text, font),
    layout: horizontalLayout,
    gap: 20,
    alignment: 'center',
    width: 500,
    height: 120,
    padding: 8,
  });
  return new DefaultSvgRenderer().render(decal);
}

describe('formatNumber', () => {
  it.each([
    [0, '0'],
    [-0, '0'],
    [0.5, '.5'],
    [-0.5, '-.5'],
    [1.005, '1'],
    [12.3456, '12.35'],
    [100, '100'],
  ])('formats %s as %s', (value, expected) => {
    expect(formatNumber(value, 2)).toBe(expected);
  });
});

describe('DefaultSvgRenderer', () => {
  const svg = renderDecal('ABA');

  it('produces a well-formed SVG 1.1 root with a viewBox', () => {
    expect(svg).toMatch(
      /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" xmlns:xlink="http:\/\/www\.w3\.org\/1999\/xlink" version="1\.1" viewBox="0 0 500 120">/,
    );
    expect(svg.endsWith('</svg>')).toBe(true);
  });

  it('uses SVG 1.1 xlink:href rather than SVG 2 href', () => {
    expect(svg).toContain('<use xlink:href="#');
    expect(svg).not.toMatch(/<use href=/);
    expect(renderDecal('')).not.toContain('xmlns:xlink');
  });

  it('uses only vector geometry and no blending (GT7 rules)', () => {
    expect(svg).not.toMatch(/<text|<image|<style|font-family|data:image|@font-face/);
    expect(svg).not.toMatch(/mix-blend-mode|isolation|<filter|feBlend|style=/);
  });

  it('defines each distinct glyph once and reuses it', () => {
    expect(svg.match(/<path id=/g)).toHaveLength(2);
    expect(svg.match(/<use /g)).toHaveLength(3);
  });

  it('is deterministic', () => {
    expect(renderDecal('ABA')).toBe(svg);
  });

  it('omits <defs> when there is no text', () => {
    expect(renderDecal('')).not.toContain('<defs>');
  });

  it('escapes attribute values', () => {
    const render = new DefaultSvgRenderer().render({
      width: 10,
      height: 10,
      items: [
        {
          kind: 'flag',
          flag: { countryCode: 'XX', name: 'x', width: 1, height: 1, elements: [{ type: 'rect', width: 1, height: 1, fill: '"><script>' }] },
          x: 0,
          y: 0,
          scale: 1,
        },
      ],
    });
    expect(render).not.toContain('<script>');
  });
});

describe('DefaultSvgOptimizer', () => {
  const optimizer = new DefaultSvgOptimizer();

  it('strips declarations, comments, metadata and whitespace', () => {
    const input = `<?xml version="1.0"?>
      <!-- note -->
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
        <metadata>junk</metadata>
        <title>t</title>
        <path d="M 0 0 L 10 10"   fill="#ff0000"/>
      </svg>`;
    expect(optimizer.optimize(input)).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0L10 10" fill="#f00"/></svg>',
    );
  });

  it('compacts and rounds path data', () => {
    const out = optimizer.optimize('<svg><path d="M 0.123456, -1.5 L 0.5 0.25 z"/></svg>');
    expect(out).toBe('<svg><path d="M.12-1.5L.5.25z"/></svg>');
  });

  it('keeps a separator between a number and a following decimal when needed', () => {
    expect(optimizer.optimize('<svg><path d="M1 .5"/></svg>')).toBe('<svg><path d="M1 .5"/></svg>');
  });

  it('leaves arc paths untouched apart from whitespace', () => {
    expect(optimizer.optimize('<svg><path d="M0 0 a1 1 0 011 1"/></svg>')).toBe(
      '<svg><path d="M0 0 a1 1 0 011 1"/></svg>',
    );
  });

  it('removes identity transforms, empty groups and plain wrappers', () => {
    const out = optimizer.optimize(
      '<svg><g transform="translate(0 0) scale(1)"><g></g><g><rect width="1" height="1"/></g></g><defs></defs><g/></svg>',
    );
    expect(out).toBe('<svg><rect width="1" height="1"/></svg>');
  });

  it('keeps scale precision while rounding translations', () => {
    const out = optimizer.optimize('<svg><g transform="translate(1.23456,2.5) scale(0.07345678)"><rect width="1" height="1"/></g></svg>');
    expect(out).toContain('transform="translate(1.23 2.5) scale(.0735)"');
  });

  it('drops default-valued attributes', () => {
    expect(optimizer.optimize('<svg><rect width="1" height="1" stroke="none" opacity="1"/></svg>')).toBe(
      '<svg><rect width="1" height="1"/></svg>',
    );
  });

  it('is idempotent', () => {
    const svg = renderDecal('ABA');
    const once = optimizer.optimize(svg);
    expect(optimizer.optimize(once)).toBe(once);
  });

  it('never grows the output', () => {
    const svg = renderDecal('ABA');
    expect(utf8ByteLength(optimizer.optimize(svg))).toBeLessThanOrEqual(utf8ByteLength(svg));
  });
});

describe('DefaultSvgSizeValidator', () => {
  const validator = new DefaultSvgSizeValidator();
  const ofSize = (bytes: number) => 'a'.repeat(bytes);

  it('counts UTF-8 bytes rather than characters', () => {
    expect('é€😀'.length).toBe(4);
    expect(utf8ByteLength('é€😀')).toBe(2 + 3 + 4);
  });

  it('classifies sizes against the 12 KB target and 15 KB limit', () => {
    expect(validator.validate(ofSize(TARGET_BYTES - 1))).toMatchObject({ status: 'safe', valid: true });
    expect(validator.validate(ofSize(TARGET_BYTES))).toMatchObject({ status: 'warning', valid: true });
    expect(validator.validate(ofSize(GT7_MAX_BYTES))).toMatchObject({ status: 'warning', valid: true });
    expect(validator.validate(ofSize(GT7_MAX_BYTES + 1))).toMatchObject({ status: 'invalid', valid: false });
  });

  it('reports the ratio to the limit', () => {
    expect(validator.validate(ofSize(GT7_MAX_BYTES / 2)).ratio).toBeCloseTo(0.5);
  });

  it('accepts custom limits', () => {
    const strict = new DefaultSvgSizeValidator({ maxBytes: 10, targetBytes: 5 });
    expect(strict.validate(ofSize(7)).status).toBe('warning');
    expect(strict.validate(ofSize(11)).status).toBe('invalid');
  });
});
