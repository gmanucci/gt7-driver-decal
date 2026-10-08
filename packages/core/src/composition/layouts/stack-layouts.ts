import type { ComposedDecal, ComposedItem, DecalLayout, LayoutInput } from '../decal-layout';

/** Flag height relative to the text cap height. */
const ROW_FLAG_RATIO = 0.85;
const COLUMN_FLAG_RATIO = 0.7;

interface StackOptions {
  direction: 'row' | 'column';
  flagFirst: boolean;
}

interface Box {
  item: ComposedItem;
  width: number;
  height: number;
}

function buildBoxes(input: LayoutInput, ratio: number): { flag?: Box; text?: Box } {
  const boxes: { flag?: Box; text?: Box } = {};

  if (input.glyphs.glyphs.length > 0) {
    boxes.text = {
      item: { kind: 'text', run: input.glyphs, x: 0, y: 0, scale: 1 },
      width: input.glyphs.width,
      height: input.glyphs.height,
    };
  }

  const { flag } = input;
  if (flag && flag.width > 0 && flag.height > 0) {
    const scale = (input.glyphs.height * ratio) / flag.height;
    boxes.flag = {
      item: { kind: 'flag', flag, x: 0, y: 0, scale },
      width: flag.width * scale,
      height: flag.height * scale,
    };
  }

  return boxes;
}

function stack(input: LayoutInput, options: StackOptions): ComposedDecal {
  const ratio = options.direction === 'row' ? ROW_FLAG_RATIO : COLUMN_FLAG_RATIO;
  const { flag, text } = buildBoxes(input, ratio);
  const ordered = (options.flagFirst ? [flag, text] : [text, flag]).filter(
    (box): box is Box => box !== undefined,
  );

  const gaps = Math.max(0, ordered.length - 1) * input.gap;
  const sum = (pick: (box: Box) => number) => ordered.reduce((total, box) => total + pick(box), 0);
  const max = (pick: (box: Box) => number) => Math.max(0, ...ordered.map(pick));

  const width = options.direction === 'row' ? sum((b) => b.width) + gaps : max((b) => b.width);
  const height = options.direction === 'row' ? max((b) => b.height) : sum((b) => b.height) + gaps;

  let cursor = 0;
  for (const box of ordered) {
    if (options.direction === 'row') {
      box.item.x = cursor;
      box.item.y = (height - box.height) / 2;
      cursor += box.width + input.gap;
    } else {
      box.item.y = cursor;
      box.item.x =
        input.alignment === 'left'
          ? 0
          : input.alignment === 'right'
            ? width - box.width
            : (width - box.width) / 2;
      cursor += box.height + input.gap;
    }
  }

  return { width, height, items: ordered.map((box) => box.item) };
}

function layout(id: string, name: string, options: StackOptions): DecalLayout {
  return { id, name, compose: (input) => stack(input, options) };
}

export const horizontalLayout = layout('horizontal', 'Flag + Text', {
  direction: 'row',
  flagFirst: true,
});

export const horizontalReverseLayout = layout('horizontal-reverse', 'Text + Flag', {
  direction: 'row',
  flagFirst: false,
});

export const verticalLayout = layout('vertical', 'Flag Above Text', {
  direction: 'column',
  flagFirst: true,
});

export const verticalReverseLayout = layout('vertical-reverse', 'Text Above Flag', {
  direction: 'column',
  flagFirst: false,
});

export const textOnlyLayout: DecalLayout = {
  id: 'text-only',
  name: 'Text Only',
  compose: (input) => stack({ ...input, flag: undefined }, { direction: 'row', flagFirst: true }),
};
