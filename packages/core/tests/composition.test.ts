import { describe, expect, it } from 'vitest';
import { DefaultDecalComposer } from '../src/composition/decal-composer';
import type { ComposedItem, PlacedFlag, PlacedText } from '../src/composition/decal-layout';
import {
  builtInLayouts,
  horizontalLayout,
  horizontalReverseLayout,
  textOnlyLayout,
  verticalLayout,
  verticalReverseLayout,
} from '../src/composition/layouts';
import { DefaultFontService } from '../src/fonts/font-service';
import { brazil, createTestFont } from './fixtures';

const font = createTestFont();
const fonts = new DefaultFontService([font]);
const composer = new DefaultDecalComposer();
// "ABC" at size 100: 300 wide x 100 tall.
const glyphs = fonts.generate('ABC', font);

function pick<T extends ComposedItem>(items: ComposedItem[], kind: T['kind']): T {
  return items.find((item) => item.kind === kind) as T;
}

describe('layouts', () => {
  it('has unique ids', () => {
    const ids = builtInLayouts.map((layout) => layout.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('horizontal puts the flag left of the text, vertically centered, separated by the gap', () => {
    const decal = horizontalLayout.compose({ flag: brazil, glyphs, gap: 10, alignment: 'center' });
    const flag = pick<PlacedFlag>(decal.items, 'flag');
    const text = pick<PlacedText>(decal.items, 'text');
    const flagHeight = brazil.height * flag.scale;
    const flagWidth = brazil.width * flag.scale;

    expect(flagHeight).toBeCloseTo(85);
    expect(flag.x).toBe(0);
    expect(flag.y).toBeCloseTo((100 - 85) / 2);
    expect(text.x).toBeCloseTo(flagWidth + 10);
    expect(decal.width).toBeCloseTo(flagWidth + 10 + 300);
    expect(decal.height).toBe(100);
  });

  it('horizontal-reverse puts the text first', () => {
    const decal = horizontalReverseLayout.compose({ flag: brazil, glyphs, gap: 10, alignment: 'center' });
    const flag = pick<PlacedFlag>(decal.items, 'flag');
    const text = pick<PlacedText>(decal.items, 'text');
    expect(text.x).toBe(0);
    expect(flag.x).toBeCloseTo(310);
  });

  it('vertical stacks the flag above the text and centers it', () => {
    const decal = verticalLayout.compose({ flag: brazil, glyphs, gap: 10, alignment: 'center' });
    const flag = pick<PlacedFlag>(decal.items, 'flag');
    const text = pick<PlacedText>(decal.items, 'text');
    const flagWidth = brazil.width * flag.scale;

    expect(flag.y).toBe(0);
    expect(text.y).toBeCloseTo(brazil.height * flag.scale + 10);
    expect(flag.x).toBeCloseTo((300 - flagWidth) / 2);
    expect(decal.width).toBe(300);
  });

  it.each([
    ['left', (flagWidth: number) => 0 * flagWidth],
    ['right', (flagWidth: number) => 300 - flagWidth],
  ] as const)('vertical honors %s alignment', (alignment, expectedX) => {
    const decal = verticalLayout.compose({ flag: brazil, glyphs, gap: 0, alignment });
    const flag = pick<PlacedFlag>(decal.items, 'flag');
    expect(flag.x).toBeCloseTo(expectedX(brazil.width * flag.scale));
  });

  it('vertical-reverse puts the text above the flag', () => {
    const decal = verticalReverseLayout.compose({ flag: brazil, glyphs, gap: 10, alignment: 'center' });
    expect(pick<PlacedText>(decal.items, 'text').y).toBe(0);
    expect(pick<PlacedFlag>(decal.items, 'flag').y).toBeCloseTo(110);
  });

  it('text-only ignores the flag', () => {
    const decal = textOnlyLayout.compose({ flag: brazil, glyphs, gap: 10, alignment: 'center' });
    expect(decal.items).toHaveLength(1);
    expect(decal.width).toBe(300);
  });

  it('omits the flag when none is provided and the text when it is empty', () => {
    expect(horizontalLayout.compose({ glyphs, gap: 10, alignment: 'center' }).items).toHaveLength(1);
    const empty = fonts.generate('', font);
    const flagOnly = horizontalLayout.compose({ flag: brazil, glyphs: empty, gap: 10, alignment: 'center' });
    expect(flagOnly.items.map((item) => item.kind)).toEqual(['flag']);
  });
});

describe('DefaultDecalComposer', () => {
  const base = { flag: brazil, glyphs, layout: horizontalLayout, gap: 10 };

  it('wraps the content when no canvas size is given', () => {
    const decal = composer.compose({ ...base, alignment: 'center', padding: 5 });
    const content = horizontalLayout.compose({ ...base, alignment: 'center' });
    expect(decal.width).toBeCloseTo(content.width + 10);
    expect(decal.height).toBeCloseTo(content.height + 10);
  });

  it('scales content uniformly to fit the canvas (width-limited)', () => {
    const content = horizontalLayout.compose({ ...base, alignment: 'center' });
    const decal = composer.compose({ ...base, alignment: 'center', width: content.width / 2, height: 500 });
    const text = pick<PlacedText>(decal.items, 'text');

    expect(decal.width).toBeCloseTo(content.width / 2);
    expect(text.scale).toBeCloseTo(0.5);
    expect(text.y).toBeCloseTo((500 - 50) / 2);
  });

  it('scales content uniformly to fit the canvas (height-limited) and honors alignment', () => {
    const content = horizontalLayout.compose({ ...base, alignment: 'center' });
    const factor = 0.5;
    const size = { width: 2000, height: content.height * factor };
    const scaledWidth = content.width * factor;

    const left = composer.compose({ ...base, ...size, alignment: 'left' });
    const center = composer.compose({ ...base, ...size, alignment: 'center' });
    const right = composer.compose({ ...base, ...size, alignment: 'right' });

    expect(pick<PlacedFlag>(left.items, 'flag').x).toBeCloseTo(0);
    expect(pick<PlacedFlag>(center.items, 'flag').x).toBeCloseTo((2000 - scaledWidth) / 2);
    expect(pick<PlacedFlag>(right.items, 'flag').x).toBeCloseTo(2000 - scaledWidth);
  });

  it('derives the missing canvas dimension from the aspect ratio', () => {
    const content = horizontalLayout.compose({ ...base, alignment: 'center' });
    const decal = composer.compose({ ...base, alignment: 'center', width: content.width * 2 });
    expect(decal.height).toBeCloseTo(content.height * 2);
  });

  it('rejects a canvas smaller than its padding', () => {
    expect(() => composer.compose({ ...base, alignment: 'center', width: 10, height: 10, padding: 5 })).toThrow(RangeError);
  });

  it('does not modify the layout output (pure)', () => {
    const first = composer.compose({ ...base, alignment: 'center', width: 400, height: 100 });
    const second = composer.compose({ ...base, alignment: 'center', width: 400, height: 100 });
    expect(second).toEqual(first);
  });
});
