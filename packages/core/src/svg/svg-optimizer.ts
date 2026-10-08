import { formatNumber } from './number-format';
import { minifyPathData } from './path-data';

export interface SvgOptimizer {
  optimize(svg: string): string;
}

export interface SvgOptimizerOptions {
  /** Decimals kept for coordinates and path data. Default 2. */
  precision?: number;
  /** Decimals kept for scale factors, which need more resolution. Default 4. */
  scalePrecision?: number;
}

type Attribute = [name: string, value: string];

type Token =
  | { kind: 'open' | 'self'; name: string; attrs: Attribute[] }
  | { kind: 'close'; name: string }
  | { kind: 'text'; value: string };

const NUMERIC_ATTRIBUTES = new Set([
  'x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry',
  'x1', 'y1', 'x2', 'y2', 'viewBox', 'points', 'stroke-width',
]);
const COLOR_ATTRIBUTES = new Set(['fill', 'stroke', 'stop-color']);
const DEFAULT_ATTRIBUTES: Record<string, string> = {
  stroke: 'none',
  opacity: '1',
  'fill-opacity': '1',
  'stroke-opacity': '1',
  'fill-rule': 'nonzero',
};
const DROPPED_ELEMENTS = ['metadata', 'title', 'desc'];
const NUMBER = /^[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?$/;

export class DefaultSvgOptimizer implements SvgOptimizer {
  private readonly precision: number;
  private readonly scalePrecision: number;

  constructor(options: SvgOptimizerOptions = {}) {
    this.precision = options.precision ?? 2;
    this.scalePrecision = options.scalePrecision ?? 4;
  }

  optimize(svg: string): string {
    let source = svg
      .replace(/<\?[\s\S]*?\?>/g, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<!DOCTYPE[^>]*>/gi, '');
    for (const name of DROPPED_ELEMENTS) {
      source = source.replace(new RegExp(`<${name}[\\s>][\\s\\S]*?</${name}>|<${name}\\s*/>`, 'gi'), '');
    }

    let tokens = this.tokenize(source);
    tokens = this.removePlainGroups(tokens);
    tokens = this.removeEmptyContainers(tokens);
    return tokens.map((token) => this.serialize(token)).join('');
  }

  private tokenize(source: string): Token[] {
    const tokens: Token[] = [];
    const tagPattern = /<(\/?)([A-Za-z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
    let last = 0;

    for (const match of source.matchAll(tagPattern)) {
      const text = source.slice(last, match.index).trim();
      if (text !== '') tokens.push({ kind: 'text', value: text });
      last = match.index + match[0].length;

      const [, closing, name, rawAttrs, selfClosing] = match as unknown as [
        string, string, string, string, string,
      ];
      if (closing) {
        tokens.push({ kind: 'close', name });
      } else {
        tokens.push({
          kind: selfClosing ? 'self' : 'open',
          name,
          attrs: this.optimizeAttributes(this.parseAttributes(rawAttrs)),
        });
      }
    }

    const tail = source.slice(last).trim();
    if (tail !== '') tokens.push({ kind: 'text', value: tail });
    return tokens;
  }

  private parseAttributes(raw: string): Attribute[] {
    const attrs: Attribute[] = [];
    for (const match of raw.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      attrs.push([match[1]!, match[2] ?? match[3] ?? '']);
    }
    return attrs;
  }

  private optimizeAttributes(attrs: Attribute[]): Attribute[] {
    const result: Attribute[] = [];
    for (const [name, rawValue] of attrs) {
      const value = rawValue.trim();
      if (DEFAULT_ATTRIBUTES[name] === value) continue;

      let next = value;
      if (name === 'd') next = this.minifyPath(value);
      else if (name === 'transform') next = this.minifyTransform(value);
      else if (NUMERIC_ATTRIBUTES.has(name)) next = this.minifyNumbers(value);
      else if (COLOR_ATTRIBUTES.has(name)) next = this.minifyColor(value);

      if (name === 'transform' && next === '') continue;
      result.push([name, next]);
    }
    return result;
  }

  private minifyNumbers(value: string): string {
    const parts = value.split(/[\s,]+/).filter(Boolean);
    if (parts.length === 0 || !parts.every((part) => NUMBER.test(part))) {
      return value;
    }
    return parts.map((part) => formatNumber(Number(part), this.precision)).join(' ');
  }

  private minifyColor(value: string): string {
    if (!/^#[0-9a-f]{3,8}$/i.test(value)) {
      return value;
    }
    const hex = value.toLowerCase();
    const short = /^#([0-9a-f])\1([0-9a-f])\2([0-9a-f])\3$/.exec(hex);
    return short ? `#${short[1]}${short[2]}${short[3]}` : hex;
  }

  private minifyTransform(value: string): string {
    const parts: string[] = [];
    for (const match of value.matchAll(/(\w+)\s*\(([^)]*)\)/g)) {
      const name = match[1]!;
      const numbers = match[2]!.split(/[\s,]+/).filter(Boolean).map(Number);
      if (numbers.some((n) => !Number.isFinite(n))) {
        return value;
      }

      if (name === 'scale') {
        const [sx = 1, sy = sx] = numbers.map((n) => Number(formatNumber(n, this.scalePrecision)));
        if (sx === 1 && sy === 1) continue;
        const args = sx === sy ? [sx] : [sx, sy];
        parts.push(`scale(${args.map((n) => formatNumber(n, this.scalePrecision)).join(' ')})`);
      } else if (name === 'translate') {
        const [tx = 0, ty = 0] = numbers.map((n) => Number(formatNumber(n, this.precision)));
        if (tx === 0 && ty === 0) continue;
        const args = ty === 0 ? [tx] : [tx, ty];
        parts.push(`translate(${args.map((n) => formatNumber(n, this.precision)).join(' ')})`);
      } else {
        parts.push(`${name}(${numbers.map((n) => formatNumber(n, this.scalePrecision)).join(' ')})`);
      }
    }
    return parts.join(' ');
  }

  private minifyPath(value: string): string {
    return minifyPathData(value, this.precision);
  }

  /** Drops attribute-less <g> wrappers together with their matching close tags. */
  private removePlainGroups(tokens: Token[]): Token[] {
    const result: Token[] = [];
    const stack: boolean[] = [];

    for (const token of tokens) {
      if (token.kind === 'open') {
        const plain = token.name === 'g' && token.attrs.length === 0;
        stack.push(plain);
        if (!plain) result.push(token);
      } else if (token.kind === 'close') {
        const plain = stack.pop();
        if (!plain) result.push(token);
      } else if (token.kind === 'self' && token.name === 'g' && token.attrs.length === 0) {
        continue;
      } else {
        result.push(token);
      }
    }
    return result;
  }

  private removeEmptyContainers(tokens: Token[]): Token[] {
    let current = tokens.filter(
      (token) => !(token.kind === 'self' && (token.name === 'g' || token.name === 'defs')),
    );

    for (let changed = true; changed; ) {
      changed = false;
      const next: Token[] = [];
      for (let i = 0; i < current.length; i++) {
        const token = current[i]!;
        const following = current[i + 1];
        if (
          token.kind === 'open' &&
          (token.name === 'g' || token.name === 'defs') &&
          following?.kind === 'close' &&
          following.name === token.name
        ) {
          i++;
          changed = true;
        } else {
          next.push(token);
        }
      }
      current = next;
    }
    return current;
  }

  private serialize(token: Token): string {
    if (token.kind === 'text') return token.value;
    if (token.kind === 'close') return `</${token.name}>`;
    const attrs = token.attrs.map(([name, value]) => ` ${name}="${value}"`).join('');
    return `<${token.name}${attrs}${token.kind === 'self' ? '/' : ''}>`;
  }
}
