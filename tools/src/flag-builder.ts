import { DefaultSvgOptimizer, DefaultSvgRenderer, minifyPathData, utf8ByteLength } from '@gt7/core';
import type { Flag, SvgPath } from '@gt7/core';
import type { PaperEnv, PaperItem } from './paper-env.ts';

/** A filled shape in the flag's native coordinate space, already clipped and transform-baked. */
interface Piece {
  item: PaperItem;
  fill: string;
}

interface Flattened {
  width: number;
  height: number;
  pieces: Piece[];
  warnings: string[];
}

export interface ReductionLevel {
  /** Decimals kept in path coordinates. */
  precision: number;
  /** Paper.js simplify tolerance for paths with many segments; 0 disables it. */
  simplify: number;
  /** Subpaths smaller than this fraction of the flag area are dropped. */
  minArea: number;
}

export const REDUCTION_LEVELS: readonly ReductionLevel[] = [
  { precision: 1, simplify: 0, minArea: 0 },
  { precision: 0, simplify: 0, minArea: 0 },
  { precision: 0, simplify: 0.5, minArea: 0.00001 },
  { precision: 0, simplify: 1, minArea: 0.00003 },
  { precision: 0, simplify: 1.5, minArea: 0.0001 },
  { precision: 0, simplify: 2, minArea: 0.0002 },
  { precision: 0, simplify: 3, minArea: 0.0004 },
  { precision: 0, simplify: 4, minArea: 0.0008 },
  { precision: 0, simplify: 5, minArea: 0.0016 },
  { precision: 0, simplify: 6, minArea: 0.003 },
  { precision: 0, simplify: 8, minArea: 0.006 },
  { precision: 0, simplify: 10, minArea: 0.012 },
  { precision: 0, simplify: 12, minArea: 0.025 },
  { precision: 0, simplify: 16, minArea: 0.05 },
];

const SIMPLIFY_MIN_SEGMENTS = 8;

export interface BuiltFlag {
  flag: Flag;
  bytes: number;
  /** Index into REDUCTION_LEVELS; > 0 means detail was lost to fit the budget. */
  level: number;
  warnings: string[];
  withinBudget: boolean;
}

const hex = (value: number) =>
  Math.round(Math.min(1, Math.max(0, value)) * 255)
    .toString(16)
    .padStart(2, '0');

function shortHex(color: string): string {
  const match = /^#([0-9a-f])\1([0-9a-f])\2([0-9a-f])\3$/.exec(color);
  return match ? `#${match[1]}${match[2]}${match[3]}` : color;
}

/** Resolves a Paper.js color to an opaque hex string, flattening gradients and alpha over white. */
function resolveColor(color: PaperItem, opacity: number, warnings: string[]): string | undefined {
  if (!color) return undefined;

  let red: number;
  let green: number;
  let blue: number;
  let alpha = color.alpha ?? 1;

  if (color.type === 'gradient') {
    const stops: PaperItem[] = color.gradient.stops;
    const colors = stops.map((stop) => stop.color);
    red = colors.reduce((sum, c) => sum + c.red, 0) / colors.length;
    green = colors.reduce((sum, c) => sum + c.green, 0) / colors.length;
    blue = colors.reduce((sum, c) => sum + c.blue, 0) / colors.length;
    alpha *= colors.reduce((sum, c) => sum + (c.alpha ?? 1), 0) / colors.length;
    warnings.push('gradient flattened to a solid color');
  } else {
    ({ red, green, blue } = color);
  }

  alpha *= opacity;
  if (alpha < 0.999) {
    warnings.push(`alpha ${alpha.toFixed(2)} blended over white`);
    red = red * alpha + (1 - alpha);
    green = green * alpha + (1 - alpha);
    blue = blue * alpha + (1 - alpha);
  }
  return shortHex(`#${hex(red)}${hex(green)}${hex(blue)}`);
}

/** Paper.js resolves gradient `href`s in document order, so referenced gradients must come first. */
function hoistBaseGradients(root: Element): void {
  for (const defs of Array.from(root.getElementsByTagName('defs'))) {
    const isDependent = (node: Element) =>
      /gradient$/i.test(node.localName) && (node.hasAttribute('xlink:href') || node.hasAttribute('href'));
    const children = Array.from(defs.children);
    for (const child of children.filter(isDependent)) {
      defs.appendChild(child);
    }
  }
}

/** Strokes become filled outlines; the offset library throws on some degenerate curves, so retry flattened. */
function strokeToFill(
  PaperOffset: PaperItem,
  subpath: PaperItem,
  halfWidth: number,
  options: Record<string, unknown>,
  warnings: string[],
): PaperItem | undefined {
  try {
    return PaperOffset.offsetStroke(subpath, halfWidth, options);
  } catch {
    try {
      const flattened = subpath.clone({ insert: false });
      flattened.flatten(0.5);
      return PaperOffset.offsetStroke(flattened, halfWidth, options);
    } catch {
      warnings.push('stroke could not be converted and was dropped');
      return undefined;
    }
  }
}

export function flattenFlag(env: PaperEnv, svg: string): Flattened {
  const { paper, PaperOffset } = env;
  paper.project.clear();

  const root = env.parseSvg(svg);
  hoistBaseGradients(root);
  const viewBox = (root.getAttribute('viewBox') ?? '').split(/[\s,]+/).map(Number);
  const [, , width = 640, height = 480] = viewBox;

  const imported = paper.project.importSVG(root, { expandShapes: true, insert: true });
  const warnings: string[] = [];
  const pieces: Piece[] = [];

  const toPath = (item: PaperItem): PaperItem =>
    item.className === 'Shape' ? item.toPath(false) : item;

  const intersectsClip = (item: PaperItem, clip: PaperItem): PaperItem | undefined => {
    const clipIsRect = clip.segments?.length === 4 && Math.abs(Math.abs(clip.area) - clip.bounds.area) < 0.01;
    if (clipIsRect && clip.bounds.contains(item.bounds)) return item;
    const result = item.intersect(clip, { insert: false });
    return result.isEmpty() || Math.abs(result.area) < 1e-6 ? undefined : result;
  };

  const emit = (item: PaperItem, fill: string | undefined, clip: PaperItem) => {
    if (!fill) return;
    const clipped = intersectsClip(item, clip);
    if (!clipped) return;
    if (clipped.className === 'CompoundPath' && clipped.fillRule === 'evenodd') {
      clipped.reorient(true, true);
    }
    pieces.push({ item: clipped, fill });
  };

  const walk = (item: PaperItem, clip: PaperItem, opacity: number): void => {
    if (item.visible === false) return;
    const itemOpacity = opacity * (item.opacity ?? 1);

    switch (item.className) {
      case 'Group':
      case 'Layer': {
        const children: PaperItem[] = [...item.children];
        let childClip = clip;
        if (children[0]?.clipMask) {
          const mask = toPath(children.shift());
          const restricted = intersectsClip(mask, clip);
          if (!restricted) return;
          childClip = restricted;
        }
        for (const child of children) walk(child, childClip, itemOpacity);
        return;
      }
      case 'Shape':
        walk(item.toPath(false), clip, opacity);
        return;
      case 'Path':
      case 'CompoundPath': {
        emit(item, resolveColor(item.fillColor, itemOpacity, warnings), clip);

        const strokeWidth: number = item.strokeWidth ?? 0;
        if (item.strokeColor && strokeWidth > 0) {
          if (item.dashArray?.length) warnings.push('dashed stroke drawn solid');
          const options = {
            join: item.strokeJoin ?? 'miter',
            cap: item.strokeCap ?? 'butt',
            limit: item.miterLimit ?? 10,
            insert: false,
          };
          const subpaths: PaperItem[] = item.className === 'CompoundPath' ? [...item.children] : [item];
          const fill = resolveColor(item.strokeColor, itemOpacity, warnings);
          if (options.cap === 'square') {
            options.cap = 'butt';
            warnings.push('square stroke cap approximated as butt');
          }
          for (const subpath of subpaths) {
            const outline = strokeToFill(PaperOffset, subpath, strokeWidth / 2, options, warnings);
            if (outline) emit(outline, fill, clip);
          }
        }
        return;
      }
      default:
        warnings.push(`unsupported item skipped: ${item.className}`);
    }
  };

  const canvas = new paper.Path.Rectangle({ point: [0, 0], size: [width, height], insert: false });
  walk(imported, canvas, 1);

  return { width, height, pieces: mergeSameFill(paper, pieces), warnings };
}

/** Merges a piece into the nearest earlier piece of the same color unless something overlapping sits between them. */
function mergeSameFill(paper: PaperItem, pieces: Piece[]): Piece[] {
  const merged: Piece[] = [];
  for (const piece of pieces) {
    let target = -1;
    for (let k = merged.length - 1; k >= 0; k--) {
      const candidate = merged[k]!;
      if (candidate.fill === piece.fill) {
        target = k;
        break;
      }
      if (candidate.item.bounds.intersects(piece.item.bounds)) break;
    }

    if (target === -1) {
      merged.push(piece);
    } else {
      const existing = merged[target]!;
      merged[target] = { fill: piece.fill, item: existing.item.unite(piece.item, { insert: false }) };
    }
  }
  void paper;
  return merged;
}

function reduce(item: PaperItem, level: ReductionLevel, minAbsoluteArea: number): PaperItem | undefined {
  const clone = item.clone({ insert: false });
  const subpaths: PaperItem[] = clone.className === 'CompoundPath' ? [...clone.children] : [clone];

  let kept = 0;
  for (const subpath of subpaths) {
    if (minAbsoluteArea > 0 && Math.abs(subpath.area) < minAbsoluteArea) {
      if (clone.className === 'CompoundPath') subpath.remove();
      continue;
    }
    kept++;
    if (level.simplify > 0 && subpath.segments.length > SIMPLIFY_MIN_SEGMENTS) {
      subpath.simplify(level.simplify);
    }
  }
  return kept === 0 ? undefined : clone;
}

function toElements(pieces: Piece[], level: ReductionLevel, area: number): SvgPath[] {
  const elements: SvgPath[] = [];
  for (const piece of pieces) {
    const reduced = reduce(piece.item, level, level.minArea * area);
    if (!reduced) continue;
    const svg = reduced.exportSVG({ precision: level.precision + 2, asString: false });
    const d = minifyPathData(svg.getAttribute('d') ?? '', level.precision);
    if (d !== '') elements.push({ type: 'path', d, fill: piece.fill });
  }
  return elements;
}

/** Bytes this flag adds to a decal, measured through the real renderer and optimizer. */
export function measureFlag(flag: Flag): number {
  const svg = new DefaultSvgOptimizer().optimize(
    new DefaultSvgRenderer().render({
      width: flag.width,
      height: flag.height,
      items: [{ kind: 'flag', flag, x: 0, y: 0, scale: 1 }],
    }),
  );
  return utf8ByteLength(svg);
}

export function buildFlag(
  env: PaperEnv,
  source: { countryCode: string; name: string; svg: string },
  budgetBytes: number,
  maxLevel: number = REDUCTION_LEVELS.length - 1,
): BuiltFlag {
  const { width, height, pieces, warnings } = flattenFlag(env, source.svg);
  const area = width * height;

  let best: BuiltFlag | undefined;
  for (const [index, level] of REDUCTION_LEVELS.slice(0, maxLevel + 1).entries()) {
    const flag: Flag = {
      countryCode: source.countryCode,
      name: source.name,
      width,
      height,
      elements: toElements(pieces, level, area),
    };
    const bytes = measureFlag(flag);
    best = {
      flag,
      bytes,
      level: index,
      warnings: [...new Set(warnings)],
      withinBudget: bytes <= budgetBytes,
    };
    if (best.withinBudget) break;
  }
  return best!;
}
