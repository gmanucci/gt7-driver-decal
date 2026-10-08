import type { Flag } from '../flags/flag';
import type { GlyphRun } from '../fonts/glyph';
import type { Alignment, ComposedDecal, DecalLayout } from './decal-layout';

export interface DecalComposition {
  flag?: Flag | undefined;
  glyphs: GlyphRun;
  layout: DecalLayout;
  /**
   * Canvas size. When both are set the content is scaled uniformly to fit;
   * when one is omitted it follows the content's aspect ratio; when both
   * are omitted the canvas wraps the content.
   */
  width?: number | undefined;
  height?: number | undefined;
  /** Space between flag and text, in the layout's unscaled content units. */
  gap: number;
  alignment: Alignment;
  /** Canvas inset on every side. Defaults to 0. */
  padding?: number | undefined;
}

export interface DecalComposer {
  compose(input: DecalComposition): ComposedDecal;
}

export class DefaultDecalComposer implements DecalComposer {
  compose(input: DecalComposition): ComposedDecal {
    const padding = input.padding ?? 0;
    const content = input.layout.compose({
      flag: input.flag,
      glyphs: input.glyphs,
      gap: input.gap,
      alignment: input.alignment,
    });

    const availableWidth = input.width === undefined ? undefined : input.width - padding * 2;
    const availableHeight = input.height === undefined ? undefined : input.height - padding * 2;
    if (
      (availableWidth !== undefined && availableWidth <= 0) ||
      (availableHeight !== undefined && availableHeight <= 0)
    ) {
      throw new RangeError('Canvas is too small for the requested padding');
    }

    let factor = 1;
    if (content.width > 0 && content.height > 0) {
      const factors: number[] = [];
      if (availableWidth !== undefined) factors.push(availableWidth / content.width);
      if (availableHeight !== undefined) factors.push(availableHeight / content.height);
      if (factors.length > 0) factor = Math.min(...factors);
    }

    const scaledWidth = content.width * factor;
    const scaledHeight = content.height * factor;
    const width = input.width ?? scaledWidth + padding * 2;
    const height = input.height ?? scaledHeight + padding * 2;

    const offsetX =
      input.alignment === 'left'
        ? padding
        : input.alignment === 'right'
          ? width - padding - scaledWidth
          : (width - scaledWidth) / 2;
    const offsetY = (height - scaledHeight) / 2;

    return {
      width,
      height,
      items: content.items.map((item) => ({
        ...item,
        x: offsetX + item.x * factor,
        y: offsetY + item.y * factor,
        scale: item.scale * factor,
      })),
    };
  }
}
