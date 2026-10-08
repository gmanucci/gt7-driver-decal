import type { ComposedDecal, PlacedFlag, PlacedText } from '../composition/decal-layout';
import { formatNumber } from './number-format';
import type { SvgElement } from './svg-element';

const COORD_PRECISION = 2;
const SCALE_PRECISION = 4;

export interface SvgRenderer {
  render(decal: ComposedDecal): string;
}

/** Short, XML-valid, deterministic ids: a..z, A..Z, then two letters. */
function glyphId(index: number): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (index < alphabet.length) {
    return alphabet[index]!;
  }
  const rest = index - alphabet.length;
  return alphabet[Math.floor(rest / alphabet.length) % alphabet.length]! + alphabet[rest % alphabet.length]!;
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function num(value: number): string {
  return formatNumber(value, COORD_PRECISION);
}

function transform(x: number, y: number, scale: number): string {
  const parts: string[] = [];
  if (x !== 0 || y !== 0) {
    parts.push(`translate(${num(x)} ${num(y)})`);
  }
  const s = formatNumber(scale, SCALE_PRECISION);
  if (s !== '1') {
    parts.push(`scale(${s})`);
  }
  return parts.join(' ');
}

function group(content: string, transformValue: string): string {
  return transformValue === '' ? content : `<g transform="${transformValue}">${content}</g>`;
}

function renderElement(element: SvgElement): string {
  const fill = escapeAttribute(element.fill);
  switch (element.type) {
    case 'rect': {
      const x = element.x ? ` x="${num(element.x)}"` : '';
      const y = element.y ? ` y="${num(element.y)}"` : '';
      return `<rect${x}${y} width="${num(element.width)}" height="${num(element.height)}" fill="${fill}"/>`;
    }
    case 'circle':
      return `<circle cx="${num(element.cx)}" cy="${num(element.cy)}" r="${num(element.r)}" fill="${fill}"/>`;
    case 'path':
      return `<path d="${escapeAttribute(element.d)}" fill="${fill}"/>`;
  }
}

function renderFlag(item: PlacedFlag): string {
  return group(item.flag.elements.map(renderElement).join(''), transform(item.x, item.y, item.scale));
}

function renderText(item: PlacedText, ids: Map<string, string>): string {
  const { run } = item;
  const drawable = run.glyphs.filter((glyph) => glyph.path !== '');
  if (drawable.length === 0) {
    return '';
  }

  // Glyph geometry lives in font units, so x/y here are font units under the group's scale.
  const baseline = drawable[0]!.y;
  const uses = drawable
    .map((glyph) => {
      const dy = glyph.y - baseline;
      const x = glyph.x !== 0 ? ` x="${formatNumber(glyph.x, COORD_PRECISION)}"` : '';
      const y = dy !== 0 ? ` y="${formatNumber(dy, COORD_PRECISION)}"` : '';
      return `<use xlink:href="#${ids.get(glyph.path)}"${x}${y}/>`;
    })
    .join('');

  const scale = run.scale * item.scale;
  return group(uses, transform(item.x, item.y + baseline * scale, scale));
}

export class DefaultSvgRenderer implements SvgRenderer {
  render(decal: ComposedDecal): string {
    // Unique glyph outlines become <defs> entries, numbered by first appearance.
    const ids = new Map<string, string>();
    for (const item of decal.items) {
      if (item.kind !== 'text') continue;
      for (const glyph of item.run.glyphs) {
        if (glyph.path !== '' && !ids.has(glyph.path)) {
          ids.set(glyph.path, glyphId(ids.size));
        }
      }
    }

    const defs =
      ids.size === 0
        ? ''
        : `<defs>${[...ids]
            .map(([path, id]) => `<path id="${id}" d="${escapeAttribute(path)}"/>`)
            .join('')}</defs>`;

    const body = decal.items
      .map((item) => (item.kind === 'flag' ? renderFlag(item) : renderText(item, ids)))
      .join('');

    const viewBox = `0 0 ${num(decal.width)} ${num(decal.height)}`;
    // GT7 accepts only SVG 1.0/1.1, where <use> links need the xlink namespace (bare href is SVG 2).
    const xlink = ids.size === 0 ? '' : ' xmlns:xlink="http://www.w3.org/1999/xlink"';
    return `<svg xmlns="http://www.w3.org/2000/svg"${xlink} version="1.1" viewBox="${viewBox}">${defs}${body}</svg>`;
  }
}
